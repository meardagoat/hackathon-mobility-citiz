from fastapi import APIRouter, Depends, Query

from app.data import get_dataset
from app.data.models import Dataset
from app.geo import BBox
from app.schemas import Area, StationsResponse, StationType, parse_bbox
from app.services import station_service
from app.services.station_service import DEFAULT_STATIONS_LIMIT, MAX_STATIONS

router = APIRouter(tags=["stations"])


@router.get("/stations", response_model=StationsResponse)
def get_stations(
    type: list[StationType] | None = Query(None),
    area: Area = Query(Area.bordeaux_metropole),
    bbox: BBox | None = Depends(parse_bbox),
    limit: int = Query(DEFAULT_STATIONS_LIMIT, ge=1, le=MAX_STATIONS),
    dataset: Dataset = Depends(get_dataset),
) -> StationsResponse:
    return station_service.get_stations(dataset, area, bbox, type, limit)
