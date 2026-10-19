from fastapi import APIRouter, Depends

from app.schemas import BBox, CoverageResponse, parse_bbox
from app.services import coverage_service

router = APIRouter(prefix="/mobility", tags=["coverage"])


@router.get("/coverage", response_model=CoverageResponse)
def get_coverage(bbox: BBox | None = Depends(parse_bbox)) -> CoverageResponse:
    return coverage_service.get_coverage(bbox)
