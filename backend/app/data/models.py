from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from app.config import DataMode
from app.coverage_levels import CoverageThresholds
from app.station_types import StationSource, StationType


class EquipmentType(str, Enum):
    citiz_station = "citiz_station"
    bus_stop = "bus_stop"
    bike_station = "bike_station"


@dataclass(frozen=True)
class Zone:
    zone_id: str
    population: float
    is_estimated: bool
    commune_codes: tuple[str, ...]
    options_count: int | None = None
    options_by_type: dict[StationType, int] | None = None
    accessibility_score: float | None = None


@dataclass(frozen=True)
class Station:
    station_id: str
    name: str
    modes: tuple[StationType, ...]
    type: StationType
    operator: str
    source: StationSource
    lon: float
    lat: float
    capacity: int | None = None
    population_served: int | None = None


@dataclass(frozen=True)
class Candidate:
    location_id: str
    equipment_type: EquipmentType
    lon: float
    lat: float
    cost: float
    population_gained: int
    estimated_value: float


@dataclass(frozen=True, eq=False)
class Dataset:
    mode: DataMode
    zones: tuple[Zone, ...]
    stations: tuple[Station, ...]
    candidates: tuple[Candidate, ...] = ()
    collected_at: datetime | None = None
    coverage_thresholds: CoverageThresholds | None = None

    @property
    def accessibility_available(self) -> bool:
        return bool(self.zones) and all(z.options_count is not None for z in self.zones)

    @property
    def recommendations_available(self) -> bool:
        return bool(self.candidates)
