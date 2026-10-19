from fastapi import APIRouter, Depends, Query

from app.schemas import BBox, StationsResponse, StationType, parse_bbox
from app.services import coverage_service

router = APIRouter(tags=["stations"])


@router.get("/stations", response_model=StationsResponse)
def get_stations(
    type: list[StationType] | None = Query(None),
    bbox: BBox | None = Depends(parse_bbox),
) -> StationsResponse:
    return coverage_service.get_stations(type, bbox)
