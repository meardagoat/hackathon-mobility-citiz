from datetime import datetime
from enum import Enum
from typing import Generic, Literal, TypeVar

from fastapi import HTTPException, Query
from pydantic import BaseModel, Field

from app.areas import DEFAULT_AREA, Area
from app.config import DataMode
from app.coverage_levels import CoverageLevel
from app.data.models import EquipmentType
from app.geo import BBox, Position
from app.station_types import StationSource, StationType

API_VERSION = "1.1.0"


class HeatmapMetric(str, Enum):
    population = "population"
    accessibility_score = "accessibility_score"
    underserved_population = "underserved_population"


class HeatmapResolution(str, Enum):
    m200 = "200m"
    km1 = "1km"


class PopulationGroupBy(str, Enum):
    coverage_level = "coverage_level"
    commune = "commune"
    station_type = "station_type"


def parse_bbox(
    bbox: str | None = Query(None, description="minLon,minLat,maxLon,maxLat (WGS84)"),
) -> BBox | None:
    if bbox is None:
        return None
    try:
        min_lon, min_lat, max_lon, max_lat = (float(v) for v in bbox.split(","))
    except ValueError:
        raise HTTPException(400, "bbox must be minLon,minLat,maxLon,maxLat")
    if min_lon >= max_lon or min_lat >= max_lat:
        raise HTTPException(400, "bbox min values must be lower than max values")
    return BBox(min_lon, min_lat, max_lon, max_lat)


class Meta(BaseModel):
    api_version: Literal["1.1.0"] = API_VERSION
    data_mode: DataMode
    area: Area
    data_collected_at: datetime | None
    accessibility_available: bool
    recommendations_available: bool


class CollectionMeta(Meta):
    total_features: int = Field(ge=0)
    returned_features: int = Field(ge=0)
    truncated: bool


class CoverageThresholdsOut(BaseModel):
    low_max: int
    medium_max: int


class SummaryMeta(Meta):
    coverage_thresholds: CoverageThresholdsOut | None


class PointGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: Position


class PolygonGeometry(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: list[list[Position]]


G = TypeVar("G", bound=BaseModel)
P = TypeVar("P", bound=BaseModel)


class Feature(BaseModel, Generic[G, P]):
    type: Literal["Feature"] = "Feature"
    geometry: G
    properties: P


class FeatureCollection(BaseModel, Generic[G, P]):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    meta: CollectionMeta
    features: list[Feature[G, P]]


class CoverageProperties(BaseModel):
    zone_id: str
    population: int = Field(ge=0)
    is_estimated: bool
    commune_codes: list[str]
    options_count: int | None = Field(ge=0)
    options_by_type: dict[StationType, int] | None
    options_per_1000_inhabitants: float | None = Field(ge=0)
    accessibility_score: float | None = Field(ge=0, le=1)
    coverage_level: CoverageLevel | None


CoverageResponse = FeatureCollection[PolygonGeometry, CoverageProperties]


class StationProperties(BaseModel):
    station_id: str
    name: str
    type: StationType
    modes: list[StationType] = Field(min_length=1)
    operator: str
    source: StationSource
    capacity: int | None = Field(ge=0)
    population_served: int | None = Field(ge=0)


StationsResponse = FeatureCollection[PointGeometry, StationProperties]


class ValueRange(BaseModel):
    min: float
    max: float


class HeatmapResponse(BaseModel):
    meta: CollectionMeta
    metric: HeatmapMetric
    resolution: HeatmapResolution
    metric_available: bool
    value_range: ValueRange | None
    points: list[tuple[float, float, float]]


class CitizSummary(BaseModel):
    stations_count: int = Field(ge=0)
    stations_per_100k_inhabitants: float | None = Field(ge=0)
    population_within_5min: int | None = Field(ge=0)
    population_within_5min_share: float | None = Field(ge=0, le=1)


class SummaryResponse(BaseModel):
    meta: SummaryMeta
    population_total: int = Field(ge=0)
    zones_count: int = Field(ge=0)
    stations_count: int = Field(ge=0)
    stations_by_type: dict[StationType, int]
    citiz: CitizSummary
    population_by_coverage_level: dict[CoverageLevel, int] | None
    population_with_any_option: int | None = Field(ge=0)
    population_with_any_option_share: float | None = Field(ge=0, le=1)


class PopulationGroup(BaseModel):
    key: str
    population: int = Field(ge=0)
    share: float | None = Field(ge=0, le=1)
    zones_count: int = Field(ge=0)


class PopulationStatsResponse(BaseModel):
    meta: Meta
    group_by: PopulationGroupBy
    available: bool
    additive: bool
    population_total: int = Field(ge=0)
    groups: list[PopulationGroup]


class RecommendationRequest(BaseModel):
    budget: float = Field(gt=0, description="EUR")
    equipment_types: list[EquipmentType] = Field(
        default_factory=lambda: list(EquipmentType), min_length=1
    )
    max_results: int = Field(20, ge=1, le=100)
    area: Area = DEFAULT_AREA


class Recommendation(BaseModel):
    rank: int = Field(ge=1)
    location_id: str
    equipment_type: EquipmentType
    lat: float
    lon: float
    cost: float = Field(ge=0, description="EUR")
    population_gained: int = Field(ge=0)
    estimated_value: float = Field(ge=0)


class RecommendationResponse(BaseModel):
    meta: Meta
    budget: float
    total_cost: float
    remaining_budget: float
    total_population_gained: int
    recommendations: list[Recommendation]
