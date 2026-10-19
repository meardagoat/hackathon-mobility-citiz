import logging
from collections import Counter
from collections.abc import Callable
from datetime import datetime
from pathlib import Path
from typing import TypeVar

import pyarrow.parquet as pq

from app.config import DataMode
from app.coverage_levels import CoverageThresholds
from app.data.models import Candidate, Dataset, EquipmentType, Station, Zone
from app.geo import parse_cell_id
from app.station_types import StationSource, StationType, gbfs_modes, gtfs_modes, primary_type, station_id

logger = logging.getLogger(__name__)

ZONES_FILE = "zones.parquet"
STATIONS_FILE = "stations.parquet"
CANDIDATES_FILE = "candidates.parquet"

ZONE_COLUMNS = {"zone_id", "population", "is_estimated", "commune_codes"}
STATION_COLUMNS = {"source", "resource_id", "native_id", "name", "operator", "lon", "lat"}
GTFS_COLUMNS = {"route_types"}
GBFS_COLUMNS = {"form_factors", "is_citiz"}
CANDIDATE_COLUMNS = {"location_id", "equipment_type", "lon", "lat", "cost", "population_gained", "estimated_value"}
OPTION_COLUMNS = {f"options_{t.value}": t for t in StationType}
ZONE_CELL_SIZE = 200
MAX_LOGGED_EXAMPLES = 5

T = TypeVar("T")


class DataLoadError(RuntimeError):
    pass


def _read(path: Path, required: set[str]) -> tuple[list[dict], set[str]]:
    if not path.exists():
        raise DataLoadError(f"missing prepared data file: {path}")
    table = pq.read_table(path)
    columns = set(table.column_names)
    missing = required - columns
    if missing:
        raise DataLoadError(f"{path.name} is missing columns: {sorted(missing)}")
    rows = table.to_pylist()
    for i, row in enumerate(rows):
        for column in sorted(required):
            if row[column] is None:
                raise DataLoadError(f"{path.name} row {i}: required column '{column}' is null")
    return rows, columns


def _convert(file: str, rows: list[dict], convert: Callable[[dict], T]) -> tuple[T, ...]:
    result = []
    for i, row in enumerate(rows):
        try:
            result.append(convert(row))
        except (TypeError, ValueError, KeyError) as error:
            raise DataLoadError(f"{file} row {i}: {error}") from error
    return tuple(result)


def _as_bool(value: object, column: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"'{column}' must be a boolean, got {value!r}")
    return value


def _zone_id(value: str) -> str:
    if parse_cell_id(value).size != ZONE_CELL_SIZE:
        raise ValueError(f"zone_id must be a {ZONE_CELL_SIZE} m INSEE cell id, got {value!r}")
    return value


def _collected_at(rows: list[dict]) -> datetime | None:
    dates = [datetime.fromisoformat(str(r["date_collecte"])) for r in rows if r.get("date_collecte")]
    return max(dates) if dates else None


def _zone(row: dict) -> Zone:
    options_by_type = {t: int(row[col]) for col, t in OPTION_COLUMNS.items() if row.get(col) is not None}
    return Zone(
        zone_id=_zone_id(row["zone_id"]),
        population=float(row["population"]),
        is_estimated=_as_bool(row["is_estimated"], "is_estimated"),
        commune_codes=tuple(row["commune_codes"]),
        options_count=None if row.get("options_count") is None else int(row["options_count"]),
        options_by_type=options_by_type or None,
        accessibility_score=row.get("accessibility_score"),
    )


def _check_station_sources(rows: list[dict], columns: set[str]) -> None:
    sources = {row["source"] for row in rows}
    for source, required in ((StationSource.gtfs, GTFS_COLUMNS), (StationSource.gbfs, GBFS_COLUMNS)):
        missing = required - columns
        if source.value in sources and missing:
            raise DataLoadError(f"{STATIONS_FILE} has {source.value} rows but is missing columns: {sorted(missing)}")
    for i, row in enumerate(rows):
        if row["source"] == StationSource.gbfs.value and row["is_citiz"] is None:
            raise DataLoadError(f"{STATIONS_FILE} row {i}: required column 'is_citiz' is null for a gbfs station")


def _station(row: dict, unknown: Counter) -> Station:
    source = StationSource(row["source"])
    if source is StationSource.gtfs:
        modes = gtfs_modes(row["route_types"] or [], unknown)
    else:
        modes = gbfs_modes(row["form_factors"] or [], _as_bool(row["is_citiz"], "is_citiz"), unknown)
    return Station(
        station_id=station_id(source, str(row["resource_id"]), str(row["native_id"])),
        name=row["name"],
        modes=modes,
        type=primary_type(modes),
        operator=row["operator"],
        source=source,
        lon=float(row["lon"]),
        lat=float(row["lat"]),
        capacity=row.get("capacity"),
        population_served=row.get("population_served"),
    )


def _stations(rows: list[dict], columns: set[str]) -> tuple[Station, ...]:
    _check_station_sources(rows, columns)
    unknown: Counter = Counter()
    examples: list[str] = []

    def convert(row: dict) -> Station:
        before = unknown.total()
        station = _station(row, unknown)
        if unknown.total() > before and len(examples) < MAX_LOGGED_EXAMPLES:
            examples.append(station.station_id)
        return station

    stations = _convert(STATIONS_FILE, rows, convert)
    if unknown:
        logger.warning(
            "unknown or missing transport types mapped to 'other': %s (examples: %s)", dict(unknown), examples
        )
    return stations


def _candidate(row: dict) -> Candidate:
    return Candidate(
        location_id=row["location_id"],
        equipment_type=EquipmentType(row["equipment_type"]),
        lon=float(row["lon"]),
        lat=float(row["lat"]),
        cost=float(row["cost"]),
        population_gained=int(row["population_gained"]),
        estimated_value=float(row["estimated_value"]),
    )


def load_prepared(data_dir: Path, coverage_thresholds: CoverageThresholds | None = None) -> Dataset:
    zone_rows, _ = _read(data_dir / ZONES_FILE, ZONE_COLUMNS)
    station_rows, station_columns = _read(data_dir / STATIONS_FILE, STATION_COLUMNS)
    candidates_path = data_dir / CANDIDATES_FILE
    candidate_rows = _read(candidates_path, CANDIDATE_COLUMNS)[0] if candidates_path.exists() else []

    dates = [d for d in (_collected_at(zone_rows), _collected_at(station_rows)) if d]
    return Dataset(
        mode=DataMode.real,
        zones=_convert(ZONES_FILE, zone_rows, _zone),
        stations=_stations(station_rows, station_columns),
        candidates=_convert(CANDIDATES_FILE, candidate_rows, _candidate),
        collected_at=max(dates) if dates else None,
        coverage_thresholds=coverage_thresholds,
    )
