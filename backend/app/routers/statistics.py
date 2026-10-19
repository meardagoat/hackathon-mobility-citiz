from fastapi import APIRouter, Depends, Query

from app.data import get_dataset
from app.data.models import Dataset
from app.geo import BBox
from app.schemas import Area, PopulationGroupBy, PopulationStatsResponse, SummaryResponse, parse_bbox
from app.services import statistics_service

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    area: Area = Query(Area.bordeaux_metropole),
    bbox: BBox | None = Depends(parse_bbox),
    dataset: Dataset = Depends(get_dataset),
) -> SummaryResponse:
    return statistics_service.get_summary(dataset, area, bbox)


@router.get("/population", response_model=PopulationStatsResponse)
def get_population(
    area: Area = Query(Area.bordeaux_metropole),
    bbox: BBox | None = Depends(parse_bbox),
    group_by: PopulationGroupBy = Query(PopulationGroupBy.coverage_level),
    dataset: Dataset = Depends(get_dataset),
) -> PopulationStatsResponse:
    return statistics_service.get_population_stats(dataset, area, bbox, group_by)
