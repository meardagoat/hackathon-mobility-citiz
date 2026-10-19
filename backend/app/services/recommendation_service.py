from app.data.models import Candidate, Dataset
from app.schemas import Recommendation, RecommendationRequest, RecommendationResponse
from app.services.selection import build_meta, select_candidates


def _priority(candidate: Candidate) -> float:
    if candidate.cost <= 0:
        return float("inf")
    return candidate.estimated_value / candidate.cost


def select_within_budget(candidates: list[Candidate], budget: float, max_results: int) -> list[Candidate]:
    selected: list[Candidate] = []
    total_cost = 0.0
    for candidate in sorted(candidates, key=lambda c: (-_priority(c), c.location_id)):
        if len(selected) >= max_results:
            break
        if total_cost + candidate.cost <= budget:
            selected.append(candidate)
            total_cost += candidate.cost
    return selected


def recommend(ds: Dataset, request: RecommendationRequest) -> RecommendationResponse:
    candidates = [c for c in select_candidates(ds, request.area) if c.equipment_type in request.equipment_types]
    selected = select_within_budget(candidates, request.budget, request.max_results)
    total_cost = sum(c.cost for c in selected)
    return RecommendationResponse(
        meta=build_meta(ds, request.area),
        budget=request.budget,
        total_cost=total_cost,
        remaining_budget=request.budget - total_cost,
        total_population_gained=sum(c.population_gained for c in selected),
        recommendations=[
            Recommendation(
                rank=rank,
                location_id=c.location_id,
                equipment_type=c.equipment_type,
                lat=c.lat,
                lon=c.lon,
                cost=c.cost,
                population_gained=c.population_gained,
                estimated_value=c.estimated_value,
            )
            for rank, c in enumerate(selected, start=1)
        ],
    )
