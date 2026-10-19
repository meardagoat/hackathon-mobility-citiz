from fastapi import APIRouter, Depends

from app.data import get_dataset
from app.data.models import Dataset
from app.schemas import RecommendationRequest, RecommendationResponse
from app.services import recommendation_service

router = APIRouter(tags=["recommendations"])


@router.post("/recommendations", response_model=RecommendationResponse)
def post_recommendations(
    request: RecommendationRequest, dataset: Dataset = Depends(get_dataset)
) -> RecommendationResponse:
    return recommendation_service.recommend(dataset, request)
