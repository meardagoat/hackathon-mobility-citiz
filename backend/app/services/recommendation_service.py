from collections import Counter

from app.areas import commune_in_area
from app.config import DataMode
from app.data.models import Candidate, Dataset, EquipmentType, Perimeter, PrecomputedRecommendation
from app.schemas import Recommendation, RecommendationRequest, RecommendationResponse
from app.services.selection import build_meta, select_candidates
from app.validation import ensure_area, invalid

BUDGET_SCENARIOS = (100_000, 250_000, 500_000, 1_000_000)
PERIMETERS = {
    frozenset(EquipmentType): Perimeter.all_types,
    frozenset({EquipmentType.citiz_station}): Perimeter.citiz,
}
PERIMETER_TYPES = {perimeter: types for types, perimeter in PERIMETERS.items()}


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


def _greedy(ds: Dataset, request: RecommendationRequest) -> RecommendationResponse:
    candidates = [c for c in select_candidates(ds, request.area) if c.equipment_type in request.equipment_types]
    selected = select_within_budget(candidates, request.budget, request.max_results)
    recommendations = []
    cumulative_cost = 0.0
    for rank, c in enumerate(selected, start=1):
        cumulative_cost += c.cost
        recommendations.append(Recommendation(
            rank=rank,
            location_id=c.location_id,
            equipment_type=c.equipment_type,
            lat=c.lat,
            lon=c.lon,
            commune_code=c.commune_code,
            cost=c.cost,
            cumulative_cost=cumulative_cost,
            population_gained=c.population_gained,
            estimated_value=c.estimated_value,
            score=None,
            adequation=None,
            cars_avoided=None,
        ))
    return RecommendationResponse(
        meta=build_meta(ds, request.area),
        budget=request.budget,
        perimeter=None,
        total_cost=cumulative_cost,
        remaining_budget=request.budget - cumulative_cost,
        total_population_gained=sum(c.population_gained for c in selected),
        population_gained_by_type=None,
        recommendations=recommendations,
    )


def scenario_for(request: RecommendationRequest) -> tuple[Perimeter, int]:
    perimeter = PERIMETERS.get(frozenset(request.equipment_types))
    if perimeter is None:
        raise invalid(
            ("body", "equipment_types"),
            "real data supports all equipment types together or ['citiz_station'] alone",
            [t.value for t in request.equipment_types],
        )
    if request.budget not in BUDGET_SCENARIOS:
        raise invalid(("body", "budget"), f"budget must be one of {list(BUDGET_SCENARIOS)}", request.budget)
    return perimeter, int(request.budget)


def _recommendation(r: PrecomputedRecommendation) -> Recommendation:
    return Recommendation(
        rank=r.rank,
        location_id=r.location_id,
        equipment_type=r.equipment_type,
        lat=r.lat,
        lon=r.lon,
        commune_code=r.commune_code,
        cost=r.cost,
        cumulative_cost=r.cumulative_cost,
        population_gained=r.population_gained,
        estimated_value=None,
        score=r.score,
        adequation=r.adequation,
        cars_avoided=r.cars_avoided,
    )


def _precomputed(ds: Dataset, request: RecommendationRequest) -> RecommendationResponse:
    perimeter, budget = scenario_for(request)
    rows = sorted(
        (r for r in ds.recommendations
         if r.perimeter is perimeter and r.budget == budget and commune_in_area(r.commune_code, request.area)),
        key=lambda r: r.rank,
    )[:request.max_results]
    total_cost = sum(r.cost for r in rows)
    by_type: Counter[EquipmentType] = Counter()
    for r in rows:
        by_type[r.equipment_type] += r.population_gained
    return RecommendationResponse(
        meta=build_meta(ds, request.area),
        budget=request.budget,
        perimeter=perimeter,
        total_cost=total_cost,
        remaining_budget=request.budget - total_cost,
        total_population_gained=sum(by_type.values()) if perimeter is Perimeter.citiz else None,
        population_gained_by_type={t: by_type[t] for t in EquipmentType if t in PERIMETER_TYPES[perimeter]},
        recommendations=[_recommendation(r) for r in rows],
    )


def recommend(ds: Dataset, request: RecommendationRequest) -> RecommendationResponse:
    ensure_area(ds, request.area, ("body", "area"))
    if ds.mode is DataMode.real:
        return _precomputed(ds, request)
    return _greedy(ds, request)
