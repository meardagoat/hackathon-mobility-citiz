import logging
from collections import Counter
from datetime import datetime
from pathlib import Path

import pyarrow.parquet as pq

from app.config import DataMode
from app.coverage_levels import CoverageThresholds
from app.data.models import Candidate, Dataset, EquipmentType, Station, Zone
from app.station_types import StationSource, StationType, gbfs_modes, gtfs_modes, primary_type, station_id

logger = logging.getLogger(__name__)

ZONES_FILE = "zones.parquet"
STATIONS_FILE = "stations.parquet"
CANDIDATES_FILE = "candidates.parquet"

ZONE_COLUMNS = {"zone_id", "population", "is_estimated", "commune_codes"}
STATION_COLUMNS = {"source", "resource_id", "native_id", "name", "operator", "lon", "lat"}
CANDIDATE_COLUMNS = {"location_id", "equipment_type", "lon", "lat", "cost", "population_gained", "estimated_value"}
OPTION_COLUMNS = {f"options_{t.value}": t for t in StationType}


class DataLoadError(RuntimeError):
    pass


def _read(path: Path, required: set[str]) -> list[dict]:
    if not path.exists():
        raise DataLoadError(f"missing prepared data file: {path}")
    table = pq.read_table(path)
    missing = required - set(table.column_names)
    if missing:
        raise DataLoadError(f"{path.name} is missing columns: {sorted(missing)}")
    return table.to_pylist()


def _collected_at(rows: list[dict]) -> datetime | None:
    dates = [datetime.fromisoformat(str(r["date_collecte"])) for r in rows if r.get("date_collecte")]
    return max(dates) if dates else None


def _zone(row: dict) -> Zone:
    options_by_type = {t: int(row[col]) for col, t in OPTION_COLUMNS.items() if row.get(col) is not None}
    return Zone(
        zone_id=row["zone_id"],
        population=float(row["population"]),
        is_estimated=bool(row["is_estimated"]),
        commune_codes=tuple(row["commune_codes"]),
        options_count=None if row.get("options_count") is None else int(row["options_count"]),
        options_by_type=options_by_type or None,
        accessibility_score=row.get("accessibility_score"),
    )


def _station(row: dict, unknown: Counter) -> Station:
    try:
        source = StationSource(row["source"])
    except ValueError:
        raise DataLoadError(f"unknown station source: {row['source']!r}")
    if source is StationSource.gtfs:
        modes = gtfs_modes(row.get("route_types") or [], unknown)
    else:
        modes = gbfs_modes(row.get("form_factors") or [], bool(row.get("is_citiz")), unknown)
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
    zone_rows = _read(data_dir / ZONES_FILE, ZONE_COLUMNS)
    station_rows = _read(data_dir / STATIONS_FILE, STATION_COLUMNS)
    candidates_path = data_dir / CANDIDATES_FILE
    candidate_rows = _read(candidates_path, CANDIDATE_COLUMNS) if candidates_path.exists() else []

    unknown: Counter = Counter()
    stations = tuple(_station(row, unknown) for row in station_rows)
    if unknown:
        logger.warning("unknown transport types mapped to 'other': %s", dict(unknown))

    dates = [d for d in (_collected_at(zone_rows), _collected_at(station_rows)) if d]
    return Dataset(
        mode=DataMode.real,
        zones=tuple(_zone(row) for row in zone_rows),
        stations=stations,
        candidates=tuple(_candidate(row) for row in candidate_rows),
        collected_at=max(dates) if dates else None,
        coverage_thresholds=coverage_thresholds,
    )
