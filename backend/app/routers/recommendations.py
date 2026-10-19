from fastapi import APIRouter

from app.schemas import RecommendationRequest, RecommendationResponse
from app.services import recommendation_service

router = APIRouter(tags=["recommendations"])


@router.post("/recommendations", response_model=RecommendationResponse)
def post_recommendations(request: RecommendationRequest) -> RecommendationResponse:
    return recommendation_service.recommend(request)
