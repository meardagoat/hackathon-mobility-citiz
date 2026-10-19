from enum import Enum
from typing import Generic, Literal, TypeVar

from fastapi import HTTPException, Query
from pydantic import BaseModel, Field


class StationType(str, Enum):
    bus = "bus"
    tram = "tram"
    bike = "bike"
    scooter = "scooter"
    citiz = "citiz"


class EquipmentType(str, Enum):
    citiz_station = "citiz_station"
    bus_stop = "bus_stop"
    bike_station = "bike_station"


Position = tuple[float, float]


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
    features: list[Feature[G, P]]


class BBox(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

    def contains(self, lon: float, lat: float) -> bool:
        return self.min_lon <= lon <= self.max_lon and self.min_lat <= lat <= self.max_lat


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
    return BBox(min_lon=min_lon, min_lat=min_lat, max_lon=max_lon, max_lat=max_lat)


class CoverageProperties(BaseModel):
    zone_id: str
    population: int = Field(ge=0)
    options_count: int = Field(ge=0)
    options_by_type: dict[StationType, int]
    options_per_1000_inhabitants: float = Field(ge=0)
    accessibility_score: float = Field(ge=0, le=1)


CoverageResponse = FeatureCollection[PolygonGeometry, CoverageProperties]


class StationProperties(BaseModel):
    station_id: str
    name: str
    type: StationType
    operator: str
    population_served: int = Field(ge=0)


StationsResponse = FeatureCollection[PointGeometry, StationProperties]


class RecommendationRequest(BaseModel):
    budget: float = Field(gt=0, description="EUR")
    equipment_types: list[EquipmentType] = Field(
        default_factory=lambda: list(EquipmentType), min_length=1
    )
    max_results: int = Field(20, ge=1, le=100)


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
    budget: float
    total_cost: float
    remaining_budget: float
    total_population_gained: int
    recommendations: list[Recommendation]
