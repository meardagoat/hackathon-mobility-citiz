import logging
from dataclasses import replace

import pytest

from app.coverage_levels import CoverageThresholds
from app.data.models import Perimeter
from app.data.prepared import load_prepared
from app.schemas import (
    CoverageResponse,
    HeatmapResponse,
    PopulationStatsResponse,
    RecommendationResponse,
    StationsResponse,
    SummaryResponse,
)
from app.services import recommendation_service
from tests.conftest import BORDEAUX, LIBOURNE
from tests.gold import CARREAUX, OFFRE_EXISTANTE, RECOMMANDATIONS, ZONE_IDS, write_gold, write_table

COVERAGE = "/api/v1/mobility/coverage"
HEATMAP = "/api/v1/mobility/heatmap"
STATIONS = "/api/v1/stations"
SUMMARY = "/api/v1/statistics/summary"
POPULATION = "/api/v1/statistics/population"
RECOMMENDATIONS = "/api/v1/recommendations"
GET_ENDPOINTS = [
    (COVERAGE, CoverageResponse),
    (HEATMAP, HeatmapResponse),
    (STATIONS, StationsResponse),
    (SUMMARY, SummaryResponse),
    (POPULATION, PopulationStatsResponse),
]
FAR_STATION = "gbfs_5e1a9c_st-99"
OUTSIDE_STATION = "gtfs_1000000000000000001"


@pytest.fixture
def gold(tmp_path):
    return load_prepared(write_gold(tmp_path))


@pytest.fixture
def gold_client(client_for, gold):
    return client_for(gold)


@pytest.fixture
def commune_client(client_for, tmp_path):
    extra = {
        "id_station": [FAR_STATION, OUTSIDE_STATION],
        "nom": ["Le Bouscat", "Libourne"],
        "type": ["velo", "bus"],
        "operateur": ["Le Vélo TBM", "Calibus"],
        "code_commune": ["33069", LIBOURNE],
        "lat": [44.9100, 44.8445],
        "lon": [-0.7000, -0.5745],
        "pop_desservie": [10, 10],
    }
    write_gold(tmp_path)
    write_table(tmp_path, "offre_existante", {k: v + extra[k] for k, v in OFFRE_EXISTANTE.items()})
    return client_for(load_prepared(tmp_path))


def _get(client, url, model=None, **params):
    response = client.get(url, params=params)
    assert response.status_code == 200, response.text
    if model:
        model.model_validate(response.json())
    return response.json()


def _post(client, **payload):
    response = client.post(RECOMMENDATIONS, json=payload)
    assert response.status_code == 200, response.text
    RecommendationResponse.model_validate(response.json())
    return response.json()


def _error_loc(response):
    assert response.status_code == 422, response.text
    return [tuple(e["loc"]) for e in response.json()["detail"]]


def _expected(perimeter: str, budget: int) -> list[str]:
    rows = [
        (rank, location)
        for rank, location, p, b in zip(RECOMMANDATIONS["rang"], RECOMMANDATIONS["id_candidat"],
                                        RECOMMANDATIONS["perimetre"], RECOMMANDATIONS["budget_scenario"])
        if p == perimeter and b == budget
    ]
    return [location for _, location in sorted(rows)]


@pytest.mark.parametrize(("url", "model"), GET_ENDPOINTS)
def test_every_get_endpoint_serves_real_data(gold_client, url, model):
    assert _get(gold_client, url, model)["meta"]["data_mode"] == "real"


def test_real_stations_keep_published_ids_and_fields(gold_client):
    features = _get(gold_client, STATIONS, StationsResponse)["features"]
    by_id = {f["properties"]["station_id"]: f for f in features}
    assert set(by_id) == set(OFFRE_EXISTANTE["id_station"])
    tram, bus = by_id["gtfs_1462783920571650283"], by_id["gtfs_9928112340017776512"]
    assert tram["properties"]["modes"] == ["tram"] and bus["properties"]["modes"] == ["bus"]
    assert tram["geometry"]["coordinates"] == [-0.5745, 44.8445]
    citiz = by_id["gbfs_77b0f2_citiz-8"]["properties"]
    assert (citiz["type"], citiz["source"], citiz["population_served"], citiz["capacity"]) == ("citiz", "gbfs", 0, None)
    assert tram["properties"]["population_served"] == 449


def test_stations_are_filtered_by_commune_not_rectangle(commune_client):
    ids = {f["properties"]["station_id"] for f in _get(commune_client, STATIONS, StationsResponse)["features"]}
    assert FAR_STATION in ids
    assert OUTSIDE_STATION not in ids
    summary = _get(commune_client, SUMMARY, SummaryResponse)
    assert summary["stations_count"] == len(OFFRE_EXISTANTE["id_station"]) + 1
    assert summary["stations_by_type"]["bike"] == 2


@pytest.mark.parametrize("params", [{"type": "scooter"}, {"bbox": "2.0,48.0,2.1,48.1"}])
def test_station_filters_without_matches_are_empty(gold_client, params):
    body = _get(gold_client, STATIONS, StationsResponse, **params)
    assert body["features"] == [] and body["meta"]["total_features"] == 0


def test_bbox_still_narrows_real_stations(gold_client):
    body = _get(gold_client, STATIONS, StationsResponse, bbox="-0.5750,44.8440,-0.5740,44.8450")
    assert {f["properties"]["station_id"] for f in body["features"]} == {
        "gtfs_1462783920571650283", "gtfs_9928112340017776512",
    }


@pytest.mark.parametrize(("url", "model"), GET_ENDPOINTS)
def test_real_data_rejects_gironde_on_get_endpoints(gold_client, url, model):
    response = gold_client.get(url, params={"area": "gironde"})
    assert _error_loc(response) == [("query", "area")]
    assert "not covered by the real data" in response.json()["detail"][0]["msg"]


def test_real_data_rejects_gironde_recommendations(gold_client):
    response = gold_client.post(RECOMMENDATIONS, json={"budget": 100_000, "area": "gironde"})
    assert _error_loc(response) == [("body", "area")]


@pytest.mark.parametrize(("equipment_types", "perimeter"), [
    (None, "tous"),
    (["citiz_station", "bus_stop", "bike_station"], "tous"),
    (["citiz_station"], "citiz"),
])
@pytest.mark.parametrize("budget", [100_000, 250_000])
def test_recommendations_follow_precomputed_ranks(gold_client, equipment_types, perimeter, budget):
    payload = {"budget": budget} | ({"equipment_types": equipment_types} if equipment_types else {})
    body = _post(gold_client, **payload)
    items = body["recommendations"]
    assert body["perimeter"] == perimeter
    assert [r["location_id"] for r in items] == _expected(perimeter, budget)
    assert [r["rank"] for r in items] == list(range(1, len(items) + 1))
    assert body["total_cost"] == items[-1]["cumulative_cost"] == sum(r["cost"] for r in items)
    assert body["remaining_budget"] == budget - body["total_cost"]
    assert body["meta"]["recommendations_available"] is True


def test_recommendation_value_fields(gold_client):
    first = _post(gold_client, budget=100_000, equipment_types=["citiz_station"])["recommendations"][0]
    assert first["estimated_value"] is None
    assert (first["score"], first["adequation"], first["cars_avoided"]) == (100.0, 0.8, 8)
    assert first["commune_code"] == "33069"
    bus = _post(gold_client, budget=100_000)["recommendations"][0]
    assert (bus["equipment_type"], bus["cars_avoided"], bus["cost"]) == ("bus_stop", 0, 15_000)


def test_unique_total_only_within_a_single_type(gold_client):
    everything = _post(gold_client, budget=250_000)
    assert everything["total_population_gained"] is None
    per_type = everything["population_gained_by_type"]
    assert set(per_type) == {"citiz_station", "bus_stop", "bike_station"}
    assert sum(per_type.values()) == sum(r["population_gained"] for r in everything["recommendations"])
    citiz = _post(gold_client, budget=250_000, equipment_types=["citiz_station"])
    assert citiz["total_population_gained"] == citiz["population_gained_by_type"]["citiz_station"]
    assert citiz["total_population_gained"] == sum(r["population_gained"] for r in citiz["recommendations"])


def test_max_results_keeps_the_top_ranks(gold_client):
    body = _post(gold_client, budget=250_000, max_results=2)
    assert [r["location_id"] for r in body["recommendations"]] == _expected("tous", 250_000)[:2]
    assert body["total_cost"] == body["recommendations"][-1]["cumulative_cost"]


@pytest.mark.parametrize("budget", [500_000, 1_000_000])
def test_published_budget_without_rows_is_empty(gold_client, budget):
    body = _post(gold_client, budget=budget)
    assert body["recommendations"] == []
    assert (body["total_cost"], body["remaining_budget"]) == (0, budget)
    assert body["population_gained_by_type"] == {"citiz_station": 0, "bus_stop": 0, "bike_station": 0}
    assert _post(gold_client, budget=budget, equipment_types=["citiz_station"])["total_population_gained"] == 0


@pytest.mark.parametrize("budget", [350, 99_999.5, 100_000.5, 2_000_000])
def test_unpublished_budget_is_rejected(gold_client, budget):
    response = gold_client.post(RECOMMENDATIONS, json={"budget": budget})
    assert _error_loc(response) == [("body", "budget")]
    assert "100000, 250000, 500000, 1000000" in response.json()["detail"][0]["msg"]


@pytest.mark.parametrize("equipment_types", [["bus_stop"], ["bike_station", "citiz_station"], ["bus_stop", "bike_station"]])
def test_unsupported_equipment_combination_is_rejected(gold_client, equipment_types):
    response = gold_client.post(RECOMMENDATIONS, json={"budget": 100_000, "equipment_types": equipment_types})
    assert _error_loc(response) == [("body", "equipment_types")]


def test_real_mode_never_runs_the_greedy_selection(client_for, gold, monkeypatch):
    def fail(*args, **kwargs):
        raise AssertionError("greedy selection used in real mode")

    monkeypatch.setattr(recommendation_service, "select_within_budget", fail)
    shuffled = replace(gold, recommendations=tuple(reversed(gold.recommendations)))
    body = _post(client_for(shuffled), budget=100_000, equipment_types=["citiz_station"])
    assert [r["rank"] for r in body["recommendations"]] == [1, 2]
    assert [r["location_id"] for r in body["recommendations"]] == _expected("citiz", 100_000)


def test_real_recommendations_ignore_rows_outside_the_area(client_for, gold):
    moved = tuple(replace(r, commune_code=LIBOURNE) if r.perimeter is Perimeter.citiz else r
                  for r in gold.recommendations)
    body = _post(client_for(replace(gold, recommendations=moved)), budget=100_000, equipment_types=["citiz_station"])
    assert body["recommendations"] == []


def test_mock_recommendations_keep_the_greedy_contract(greedy_client):
    body = _post(greedy_client, budget=350, equipment_types=["bus_stop", "bike_station"])
    assert body["perimeter"] is None and body["population_gained_by_type"] is None
    assert [r["location_id"] for r in body["recommendations"]] == ["cand-a", "cand-c"]
    assert [r["cumulative_cost"] for r in body["recommendations"]] == [100, 300]
    assert body["total_population_gained"] == 90
    for r in body["recommendations"]:
        assert r["estimated_value"] is not None
        assert r["score"] is None and r["adequation"] is None and r["cars_avoided"] is None
        assert r["commune_code"] == BORDEAUX


def test_mock_mode_still_serves_gironde(mock_client):
    assert _get(mock_client, STATIONS, StationsResponse, area="gironde")["meta"]["area"] == "gironde"
    assert mock_client.post(RECOMMENDATIONS, json={"budget": 350, "area": "gironde"}).status_code == 200


def _responses(client) -> list[str]:
    gets = [(COVERAGE, {}), (STATIONS, {}), (SUMMARY, {}),
            *[(HEATMAP, {"metric": m, "resolution": r}) for m in ("population", "underserved_population")
              for r in ("200m", "1km")],
            *[(POPULATION, {"group_by": g}) for g in ("coverage_level", "commune", "station_type")]]
    texts = [client.get(url, params=params).text for url, params in gets]
    for types in (None, ["citiz_station"]):
        for budget in (100_000, 250_000):
            payload = {"budget": budget} | ({"equipment_types": types} if types else {})
            texts.append(client.post(RECOMMENDATIONS, json=payload).text)
    return texts


def test_masked_population_cannot_be_recovered(client_for, tmp_path):
    snapshots = []
    for value in (CARREAUX["population"][2], 987_654):
        directory = tmp_path / str(value)
        directory.mkdir()
        write_gold(directory)
        population = list(CARREAUX["population"])
        population[2] = value
        write_table(directory, "carreaux", {**CARREAUX, "population": population})
        snapshots.append(_responses(client_for(load_prepared(directory, CoverageThresholds(low_max=1, medium_max=3)))))
    assert snapshots[0] == snapshots[1]
    assert "987654" not in "".join(snapshots[1])


def test_masked_square_is_excluded_from_derived_populations(gold_client):
    stations = {f["properties"]["station_id"]: f["properties"] for f in _get(gold_client, STATIONS)["features"]}
    assert stations["gtfs_1462783920571650283"]["population_served"] == 455 - CARREAUX["population"][2]
    citiz = _post(gold_client, budget=100_000, equipment_types=["citiz_station"])
    assert citiz["recommendations"][0]["population_gained"] == 43 - CARREAUX["population"][2]
    coverage = {f["properties"]["zone_id"]: f["properties"] for f in _get(gold_client, COVERAGE)["features"]}
    masked = coverage[ZONE_IDS[2]]
    assert masked["population"] is None and masked["options_per_1000_inhabitants"] is None
    assert masked["is_estimated"] is True and masked["options_count"] == 0


def test_consistent_tables_reproduce_every_published_gain(tmp_path, caplog):
    with caplog.at_level(logging.WARNING):
        load_prepared(write_gold(tmp_path))
    assert "pop_nouvelle could not be reproduced" not in caplog.text


def test_gain_mismatch_names_the_scenario_and_rank(tmp_path, caplog):
    write_gold(tmp_path)
    gains = list(RECOMMANDATIONS["pop_nouvelle"])
    gains[1] += 1
    write_table(tmp_path, "recommandations", {**RECOMMANDATIONS, "pop_nouvelle": gains})
    with caplog.at_level(logging.WARNING):
        load_prepared(tmp_path)
    assert "for 1 of 12 recommendations" in caplog.text
    assert f"tous/100000 rank 2 {RECOMMANDATIONS['id_candidat'][1]}: published 44, reproduced 43" in caplog.text


def test_score_bounds_load_and_serialize(client_for, tmp_path):
    write_gold(tmp_path)
    rows = [i for i, (p, b) in enumerate(zip(RECOMMANDATIONS["perimetre"], RECOMMANDATIONS["budget_scenario"]))
            if p == "tous" and b == 100_000]
    scores = list(RECOMMANDATIONS["score"])
    scores[rows[0]], scores[rows[1]] = 0.0, 100.0
    write_table(tmp_path, "recommandations", {**RECOMMANDATIONS, "score": scores})
    body = _post(client_for(load_prepared(tmp_path)), budget=100_000)
    assert [r["score"] for r in body["recommendations"][:2]] == [0.0, 100.0]


OUTSIDE_COVERAGE = "2.0,48.0,2.1,48.1"


def test_empty_bbox_keeps_accessibility_score_unavailable(gold_client):
    body = _get(gold_client, HEATMAP, HeatmapResponse, metric="accessibility_score", bbox=OUTSIDE_COVERAGE)
    assert body["metric_available"] is False
    assert body["points"] == [] and body["value_range"] is None
    assert _get(gold_client, HEATMAP, HeatmapResponse, metric="accessibility_score")["metric_available"] is False


def test_empty_bbox_keeps_accessibility_score_available_when_provided(real_client):
    body = _get(real_client, HEATMAP, HeatmapResponse, metric="accessibility_score", bbox=OUTSIDE_COVERAGE)
    assert body["metric_available"] is True
    assert body["points"] == [] and body["value_range"] is None


def test_empty_bbox_lists_only_measured_station_types(gold_client):
    everywhere = _get(gold_client, POPULATION, PopulationStatsResponse, group_by="station_type")
    outside = _get(gold_client, POPULATION, PopulationStatsResponse, group_by="station_type", bbox=OUTSIDE_COVERAGE)
    assert [g["key"] for g in outside["groups"]] == [g["key"] for g in everywhere["groups"]]
    assert all(g["population"] == 0 and g["zones_count"] == 0 for g in outside["groups"])
    assert outside["population_total"] == 0
