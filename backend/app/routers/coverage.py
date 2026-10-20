from fastapi import APIRouter, Depends, Query

from app.data import get_dataset
from app.data.models import Dataset
from app.geo import BBox
from app.schemas import (
    Area,
    CoverageLevel,
    CoverageResponse,
    HeatmapMetric,
    HeatmapResolution,
    HeatmapResponse,
    parse_bbox,
)
from app.services import coverage_service
from app.services.coverage_service import MAX_COVERAGE_FEATURES
from app.validation import supported_area

router = APIRouter(prefix="/mobility", tags=["coverage"])


@router.get("/coverage", response_model=CoverageResponse)
def get_coverage(
    area: Area = Depends(supported_area),
    bbox: BBox | None = Depends(parse_bbox),
    limit: int = Query(MAX_COVERAGE_FEATURES, ge=1, le=MAX_COVERAGE_FEATURES),
    coverage_level: list[CoverageLevel] | None = Query(None),
    dataset: Dataset = Depends(get_dataset),
) -> CoverageResponse:
    return coverage_service.get_coverage(dataset, area, bbox, limit, coverage_level)


@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    area: Area = Depends(supported_area),
    bbox: BBox | None = Depends(parse_bbox),
    metric: HeatmapMetric = Query(HeatmapMetric.population),
    resolution: HeatmapResolution = Query(HeatmapResolution.m200),
    dataset: Dataset = Depends(get_dataset),
) -> HeatmapResponse:
    return coverage_service.get_heatmap(dataset, area, bbox, metric, resolution)
