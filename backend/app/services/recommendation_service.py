from app.schemas import (
    EquipmentType,
    Recommendation,
    RecommendationRequest,
    RecommendationResponse,
)

MOCK_COSTS = {
    EquipmentType.citiz_station: 15_000,
    EquipmentType.bus_stop: 10_000,
    EquipmentType.bike_station: 30_000,
}

_MOCK_CANDIDATES = [
    ("cand-neudorf-1", EquipmentType.citiz_station, 48.5710, 7.7600, 2400, 0.82),
    ("cand-neudorf-2", EquipmentType.bike_station, 48.5695, 7.7555, 3100, 0.74),
    ("cand-cronenbourg", EquipmentType.bus_stop, 48.5930, 7.7180, 1800, 0.66),
    ("cand-hautepierre", EquipmentType.citiz_station, 48.5935, 7.6990, 2900, 0.71),
    ("cand-meinau", EquipmentType.bike_station, 48.5550, 7.7480, 2600, 0.63),
    ("cand-koenigshoffen", EquipmentType.bus_stop, 48.5790, 7.7110, 1500, 0.58),
    ("cand-robertsau", EquipmentType.citiz_station, 48.6020, 7.7820, 2000, 0.69),
    ("cand-port-du-rhin", EquipmentType.bike_station, 48.5700, 7.7900, 1200, 0.47),
    ("cand-elsau", EquipmentType.bus_stop, 48.5640, 7.7250, 1300, 0.52),
    ("cand-illkirch", EquipmentType.citiz_station, 48.5300, 7.7150, 2200, 0.61),
]


def recommend(request: RecommendationRequest) -> RecommendationResponse:
    candidates = [c for c in _MOCK_CANDIDATES if c[1] in request.equipment_types]
    candidates.sort(key=lambda c: c[4] / MOCK_COSTS[c[1]], reverse=True)

    selected: list[Recommendation] = []
    total_cost = 0.0
    for location_id, equipment_type, lat, lon, population_gained, estimated_value in candidates:
        if len(selected) >= request.max_results:
            break
        cost = MOCK_COSTS[equipment_type]
        if total_cost + cost > request.budget:
            continue
        total_cost += cost
        selected.append(
            Recommendation(
                rank=len(selected) + 1,
                location_id=location_id,
                equipment_type=equipment_type,
                lat=lat,
                lon=lon,
                cost=cost,
                population_gained=population_gained,
                estimated_value=estimated_value,
            )
        )

    return RecommendationResponse(
        budget=request.budget,
        total_cost=total_cost,
        remaining_budget=request.budget - total_cost,
        total_population_gained=sum(r.population_gained for r in selected),
        recommendations=selected,
    )
