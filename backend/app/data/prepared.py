import logging
import math
from collections import defaultdict
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import TypeVar

import pyarrow.parquet as pq

from app.areas import Area
from app.config import DataMode
from app.coverage_levels import CoverageThresholds
from app.data.models import Dataset, EquipmentType, Perimeter, PrecomputedRecommendation, Station, Zone
from app.data.population import GRID_EPSG, ZoneGrid, candidate_cell, with_served_population, with_visible_gains
from app.geo import parse_cell_id
from app.station_types import StationSource, StationType

logger = logging.getLogger(__name__)

ZONES_FILE = "carreaux.parquet"
STATIONS_FILE = "offre_existante.parquet"
RECOMMENDATIONS_FILE = "recommandations.parquet"
META_FILE = "meta.parquet"

ZONE_COLUMNS = {"id_carreau", "code_commune", "population", "nb_options", "donnee_masquee"}
STATION_COLUMNS = {"id_station", "nom", "type", "operateur", "code_commune", "lon", "lat", "pop_desservie"}
RECOMMENDATION_COLUMNS = {
    "perimetre", "budget_scenario", "rang", "id_candidat", "type", "lon", "lat", "code_commune",
    "cout_eur", "cout_cumule_eur", "pop_nouvelle", "score", "adequation", "voitures_evitees",
}
META_COLUMNS = {"date_maj", "rayon_m"}

OPTIONS_COLUMN = "nb_options"
OPTION_PREFIX = "nb_"
ZONE_CELL_SIZE = 200
COMMUNE_CODE_LENGTH = 5
COVERED_AREAS = frozenset({Area.bordeaux_metropole})
MAX_LOGGED_EXAMPLES = 5

STATION_TYPES = {
    "bus": StationType.bus,
    "tram": StationType.tram,
    "metro": StationType.metro,
    "train": StationType.train,
    "bateau": StationType.ferry,
    "velo": StationType.bike,
    "citiz": StationType.citiz,
}
EQUIPMENT_TYPES = {
    "bus": EquipmentType.bus_stop,
    "velo": EquipmentType.bike_station,
    "citiz": EquipmentType.citiz_station,
}
STATION_SOURCES = {"gtfs_": StationSource.gtfs, "gbfs_": StationSource.gbfs}
PERIMETER_TYPES = {
    Perimeter.all_types: frozenset(EquipmentType),
    Perimeter.citiz: frozenset({EquipmentType.citiz_station}),
}

T = TypeVar("T")


class DataLoadError(RuntimeError):
    pass


def _read(path: Path, required: set[str]) -> tuple[list[dict], list[str]]:
    if not path.exists():
        raise DataLoadError(f"missing prepared data file: {path}")
    table = pq.read_table(path)
    missing = required - set(table.column_names)
    if missing:
        raise DataLoadError(f"{path.name} is missing columns: {sorted(missing)}")
    rows = table.to_pylist()
    for i, row in enumerate(rows):
        for column in sorted(required):
            if row[column] is None:
                raise DataLoadError(f"{path.name} row {i}: required column '{column}' is null")
    return rows, table.column_names


def _convert(file: str, rows: list[dict], convert: Callable[[dict], T]) -> tuple[T, ...]:
    result = []
    for i, row in enumerate(rows):
        try:
            result.append(convert(row))
        except (TypeError, ValueError, KeyError) as error:
            raise DataLoadError(f"{file} row {i}: {error}") from error
    return tuple(result)


def _check_unique(file: str, values: list[str], column: str) -> None:
    seen = set()
    for i, value in enumerate(values):
        if value in seen:
            raise DataLoadError(f"{file} row {i}: duplicate {column} {value!r}")
        seen.add(value)


def _as_bool(value: object, column: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"'{column}' must be a boolean, got {value!r}")
    return value


def _as_text(value: object, column: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"'{column}' must be a non-empty string, got {value!r}")
    return value


def _as_number(value: object, column: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"'{column}' must be a finite number, got {value!r}")
    return float(value)


def _as_count(value: object, column: str) -> int:
    integral = (isinstance(value, int) and not isinstance(value, bool)) or (
        isinstance(value, float) and value.is_integer()
    )
    if not integral or value < 0:
        raise ValueError(f"'{column}' must be a non-negative integer, got {value!r}")
    return int(value)


def _as_fraction(value: object, column: str) -> float:
    number = _as_number(value, column)
    if not 0 <= number <= 1:
        raise ValueError(f"'{column}' must be between 0 and 1, got {value!r}")
    return number


def _lookup(mapping: dict[str, T], value: object, label: str) -> T:
    if value not in mapping:
        raise ValueError(f"unknown {label} {value!r}")
    return mapping[value]


def _commune_code(value: object) -> str:
    if not isinstance(value, str) or len(value) != COMMUNE_CODE_LENGTH:
        raise ValueError(f"'code_commune' must be a {COMMUNE_CODE_LENGTH}-character INSEE code, got {value!r}")
    return value


def _position(row: dict) -> tuple[float, float]:
    lon, lat = _as_number(row["lon"], "lon"), _as_number(row["lat"], "lat")
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError(f"lon/lat must be WGS84 degrees, got ({lon}, {lat})")
    return lon, lat


def _zone_id(value: object) -> str:
    zone_id = _as_text(value, "id_carreau")
    cell = parse_cell_id(zone_id)
    if cell.size != ZONE_CELL_SIZE or cell.epsg != GRID_EPSG:
        raise ValueError(f"id_carreau must be a {ZONE_CELL_SIZE} m EPSG:{GRID_EPSG} INSEE cell id, got {zone_id!r}")
    return zone_id


def _option_columns(columns: list[str]) -> dict[str, StationType]:
    names = [c for c in columns if c.startswith(OPTION_PREFIX) and c != OPTIONS_COLUMN]
    try:
        return {c: _lookup(STATION_TYPES, c.removeprefix(OPTION_PREFIX), "station type") for c in sorted(names)}
    except ValueError as error:
        raise DataLoadError(f"{ZONES_FILE} option column: {error}") from error


def _check_option_coverage(option_columns: dict[str, StationType], stations: tuple[Station, ...]) -> None:
    names = {t: name for name, t in STATION_TYPES.items()}
    missing = {s.type for s in stations} - set(option_columns.values())
    if missing:
        expected = sorted(f"{OPTION_PREFIX}{names[t]}" for t in missing)
        raise DataLoadError(f"{ZONES_FILE} is missing option columns for station types present in "
                            f"{STATIONS_FILE}: {expected}")


def _zone(row: dict, option_columns: dict[str, StationType]) -> Zone:
    options_count = _as_count(row[OPTIONS_COLUMN], OPTIONS_COLUMN)
    options_by_type = {t: _as_count(row[c], c) for c, t in option_columns.items()}
    if options_by_type and sum(options_by_type.values()) != options_count:
        raise ValueError(f"'{OPTIONS_COLUMN}' is {options_count} but the per-type columns sum to "
                         f"{sum(options_by_type.values())}")
    return Zone(
        zone_id=_zone_id(row["id_carreau"]),
        population=float(_as_count(row["population"], "population")),
        is_estimated=_as_bool(row["donnee_masquee"], "donnee_masquee"),
        commune_codes=(_commune_code(row["code_commune"]),),
        options_count=options_count,
        options_by_type=options_by_type or None,
    )


def _station_source(station_id: str) -> StationSource:
    for prefix, source in STATION_SOURCES.items():
        if station_id.startswith(prefix):
            return source
    raise ValueError(f"id_station must start with one of {sorted(STATION_SOURCES)}, got {station_id!r}")


def _station(row: dict) -> Station:
    station_id = _as_text(row["id_station"], "id_station")
    station_type = _lookup(STATION_TYPES, row["type"], "station type")
    lon, lat = _position(row)
    return Station(
        station_id=station_id,
        name=_as_text(row["nom"], "nom"),
        modes=(station_type,),
        type=station_type,
        operator=_as_text(row["operateur"], "operateur"),
        source=_station_source(station_id),
        lon=lon,
        lat=lat,
        commune_code=_commune_code(row["code_commune"]),
        population_served=_as_count(row["pop_desservie"], "pop_desservie"),
    )


def _recommendation(row: dict) -> PrecomputedRecommendation:
    perimeter = Perimeter(row["perimetre"])
    equipment_type = _lookup(EQUIPMENT_TYPES, row["type"], "equipment type")
    if equipment_type not in PERIMETER_TYPES[perimeter]:
        raise ValueError(f"equipment type {row['type']!r} is outside perimeter {perimeter.value!r}")
    location_id = _as_text(row["id_candidat"], "id_candidat")
    if not location_id.startswith(f"{row['type']}_"):
        raise ValueError(f"id_candidat must start with '{row['type']}_', got {location_id!r}")
    _zone_id(candidate_cell(location_id).id)
    lon, lat = _position(row)
    return PrecomputedRecommendation(
        perimeter=perimeter,
        budget=_as_count(row["budget_scenario"], "budget_scenario"),
        rank=_as_count(row["rang"], "rang"),
        location_id=location_id,
        equipment_type=equipment_type,
        lon=lon,
        lat=lat,
        commune_code=_commune_code(row["code_commune"]),
        cost=_as_count(row["cout_eur"], "cout_eur"),
        cumulative_cost=_as_count(row["cout_cumule_eur"], "cout_cumule_eur"),
        population_gained=_as_count(row["pop_nouvelle"], "pop_nouvelle"),
        score=_as_number(row["score"], "score"),
        adequation=_as_fraction(row["adequation"], "adequation"),
        cars_avoided=_as_count(row["voitures_evitees"], "voitures_evitees"),
    )


def _check_scenario(perimeter: Perimeter, budget: int, rows: list[PrecomputedRecommendation]) -> None:
    name = f"{RECOMMENDATIONS_FILE} scenario {perimeter.value}/{budget}"
    ranks = [r.rank for r in rows]
    if ranks != list(range(1, len(rows) + 1)):
        raise DataLoadError(f"{name}: ranks must run from 1 to {len(rows)} without gaps, got {ranks}")
    _check_unique(name, [r.location_id for r in rows], "id_candidat")
    total = 0
    for r in rows:
        total += r.cost
        if r.cumulative_cost != total:
            raise DataLoadError(f"{name} rank {r.rank}: cout_cumule_eur is {r.cumulative_cost}, expected {total}")
    if total > budget:
        raise DataLoadError(f"{name}: total cost {total} exceeds the budget")


def _recommendations(rows: list[dict]) -> tuple[PrecomputedRecommendation, ...]:
    recommendations = sorted(
        _convert(RECOMMENDATIONS_FILE, rows, _recommendation),
        key=lambda r: (r.perimeter.value, r.budget, r.rank),
    )
    scenarios: dict[tuple[Perimeter, int], list[PrecomputedRecommendation]] = defaultdict(list)
    for r in recommendations:
        scenarios[(r.perimeter, r.budget)].append(r)
    for (perimeter, budget), scenario in scenarios.items():
        _check_scenario(perimeter, budget, scenario)
    return tuple(recommendations)


def _updated_at(row: dict) -> datetime:
    value = row["date_maj"]
    updated_at = value if isinstance(value, datetime) else datetime.fromisoformat(_as_text(value, "date_maj"))
    if updated_at.tzinfo is None:
        raise ValueError(f"'date_maj' must include a timezone, got {value!r}")
    return updated_at


def _meta(rows: list[dict]) -> tuple[datetime, int]:
    if not rows:
        raise DataLoadError(f"{META_FILE} has no rows")
    radii = set(_convert(META_FILE, rows, lambda row: _as_count(row["rayon_m"], "rayon_m")))
    if len(radii) != 1 or 0 in radii:
        raise DataLoadError(f"{META_FILE} must define a single positive rayon_m, got {sorted(radii)}")
    return max(_convert(META_FILE, rows, _updated_at)), radii.pop()


def load_prepared(data_dir: Path, coverage_thresholds: CoverageThresholds | None = None) -> Dataset:
    zone_rows, zone_columns = _read(data_dir / ZONES_FILE, ZONE_COLUMNS)
    station_rows, _ = _read(data_dir / STATIONS_FILE, STATION_COLUMNS)
    recommendation_rows, _ = _read(data_dir / RECOMMENDATIONS_FILE, RECOMMENDATION_COLUMNS)
    meta_rows, _ = _read(data_dir / META_FILE, META_COLUMNS)

    stations = _convert(STATIONS_FILE, station_rows, _station)
    _check_unique(STATIONS_FILE, [s.station_id for s in stations], "id_station")
    option_columns = _option_columns(zone_columns)
    _check_option_coverage(option_columns, stations)
    zones = _convert(ZONES_FILE, zone_rows, lambda row: _zone(row, option_columns))
    _check_unique(ZONES_FILE, [z.zone_id for z in zones], "id_carreau")
    collected_at, radius = _meta(meta_rows)

    grid = ZoneGrid(zones)
    recommendations, mismatches = with_visible_gains(_recommendations(recommendation_rows), grid, radius)
    if mismatches:
        logger.warning("pop_nouvelle could not be reproduced from %s for %d of %d recommendations; "
                       "the squares table may be incomplete (examples: %s)", ZONES_FILE, len(mismatches),
                       len(recommendations), "; ".join(mismatches[:MAX_LOGGED_EXAMPLES]))

    return Dataset(
        mode=DataMode.real,
        zones=zones,
        stations=with_served_population(stations, grid, radius),
        recommendations=recommendations,
        collected_at=collected_at,
        coverage_thresholds=coverage_thresholds,
        areas=COVERED_AREAS,
    )
