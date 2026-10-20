from dataclasses import replace

import pytest

from app.config import DataMode
from app.data.models import Dataset
from app.schemas import (
    CoverageResponse,
    HeatmapResponse,
    PopulationStatsResponse,
    RecommendationResponse,
    StationsResponse,
    SummaryResponse,
)
from tests.conftest import accessible_dataset

COVERAGE = "/api/v1/mobility/coverage"
HEATMAP = "/api/v1/mobility/heatmap"
STATIONS = "/api/v1/stations"
SUMMARY = "/api/v1/statistics/summary"
POPULATION = "/api/v1/statistics/population"
RECOMMENDATIONS = "/api/v1/recommendations"


def _get(client, url, model, **params):
    response = client.get(url, params=params)
    assert response.status_code == 200, response.text
    model.model_validate(response.json())
    return response.json()


def test_mock_meta_is_explicit(mock_client):
    meta = _get(mock_client, COVERAGE, CoverageResponse)["meta"]
    assert meta["api_version"] == "1.1.0"
    assert meta["data_mode"] == "mock"
    assert meta["area"] == "bordeaux_metropole"
    assert meta["data_collected_at"] is None
    assert meta["accessibility_available"] is False
    assert meta["recommendations_available"] is False


def test_real_meta_is_explicit(real_client):
    meta = _get(real_client, COVERAGE, CoverageResponse)["meta"]
    assert meta["data_mode"] == "real"
    assert meta["accessibility_available"] is True
    assert meta["recommendations_available"] is True


def test_mock_coverage_has_no_derived_values(mock_client):
    body = _get(mock_client, COVERAGE, CoverageResponse)
    assert body["features"]
    for feature in body["features"]:
        ring = feature["geometry"]["coordinates"][0]
        assert len(ring) == 5 and ring[0] == ring[-1]
        props = feature["properties"]
        assert props["commune_codes"] != ["33243"]
        for field in ("options_count", "options_by_type", "options_per_1000_inhabitants",
                      "accessibility_score", "coverage_level"):
            assert props[field] is None


def test_coverage_area_selection(mock_client):
    metropole = _get(mock_client, COVERAGE, CoverageResponse)["features"]
    gironde = _get(mock_client, COVERAGE, CoverageResponse, area="gironde")["features"]
    assert len(gironde) == len(metropole) + 1
    assert mock_client.get(COVERAGE, params={"area": "paris"}).status_code == 422


def test_coverage_limit_and_truncation(mock_client):
    body = _get(mock_client, COVERAGE, CoverageResponse, limit=2)
    meta = body["meta"]
    assert meta["truncated"] is True
    assert meta["returned_features"] == len(body["features"]) == 2
    assert meta["total_features"] > 2
    populations = [f["properties"]["population"] for f in body["features"]]
    assert populations == sorted(populations, reverse=True)
    full = _get(mock_client, COVERAGE, CoverageResponse)["meta"]
    assert full["truncated"] is False
    assert mock_client.get(COVERAGE, params={"limit": 0}).status_code == 422
    assert mock_client.get(COVERAGE, params={"limit": 5001}).status_code == 422


def test_coverage_is_deterministic(mock_client):
    first = mock_client.get(COVERAGE).json()
    assert first == mock_client.get(COVERAGE).json()


def test_coverage_level_filter_without_levels_is_empty(mock_client):
    body = _get(mock_client, COVERAGE, CoverageResponse, coverage_level="none")
    assert body["features"] == []


def test_real_coverage_levels_and_ratios(real_client):
    features = _get(real_client, COVERAGE, CoverageResponse)["features"]
    by_id = {f["properties"]["zone_id"]: f["properties"] for f in features}
    busiest = by_id["CRS3035RES200mN2473800E3486600"]
    assert busiest["options_count"] == 6
    assert busiest["coverage_level"] == "high"
    assert busiest["options_per_1000_inhabitants"] == 15.0
    assert by_id["CRS3035RES200mN2474000E3486800"]["coverage_level"] == "none"
    only_none = _get(real_client, COVERAGE, CoverageResponse, coverage_level="none")["features"]
    assert [f["properties"]["zone_id"] for f in only_none] == ["CRS3035RES200mN2474000E3486800"]


def test_heatmap_population(mock_client):
    coverage = _get(mock_client, COVERAGE, CoverageResponse)["features"]
    visible = [f["properties"]["population"] for f in coverage if not f["properties"]["is_estimated"]]
    body = _get(mock_client, HEATMAP, HeatmapResponse)
    assert body["metric"] == "population" and body["metric_available"] is True
    assert len(body["points"]) == len(visible) and body["masked_zones_count"] == len(coverage) - len(visible) == 1
    assert sum(p[2] for p in body["points"]) == sum(visible)
    assert body["value_range"]["min"] <= body["value_range"]["max"]
    assert "features" not in body


def test_heatmap_1km_preserves_population(mock_client):
    fine = _get(mock_client, HEATMAP, HeatmapResponse)["points"]
    coarse = _get(mock_client, HEATMAP, HeatmapResponse, resolution="1km")["points"]
    assert len(coarse) < len(fine)
    assert sum(p[2] for p in coarse) == sum(p[2] for p in fine)


@pytest.mark.parametrize("metric", ["accessibility_score", "underserved_population"])
def test_heatmap_unavailable_metric_has_no_points(mock_client, metric):
    body = _get(mock_client, HEATMAP, HeatmapResponse, metric=metric)
    assert body["metric_available"] is False
    assert body["points"] == []
    assert body["value_range"] is None


def test_heatmap_real_metrics(real_client):
    underserved = _get(real_client, HEATMAP, HeatmapResponse, metric="underserved_population")
    assert sum(p[2] for p in underserved["points"]) == 100
    scores = _get(real_client, HEATMAP, HeatmapResponse, metric="accessibility_score")
    assert scores["metric_available"] is True
    assert scores["value_range"] == {"min": 0.0, "max": 0.9}


def test_mock_stations(mock_client):
    features = _get(mock_client, STATIONS, StationsResponse)["features"]
    assert features
    for feature in features:
        props = feature["properties"]
        assert props["station_id"].startswith("mock:")
        assert props["source"] == "mock"
        assert props["type"] in props["modes"]
        assert props["population_served"] is None


def test_station_type_filter_matches_modes(mock_client):
    features = _get(mock_client, STATIONS, StationsResponse, type="bus")["features"]
    by_id = {f["properties"]["station_id"]: f["properties"] for f in features}
    assert by_id["mock:quinconces"]["type"] == "tram"
    assert all("bus" in p["modes"] for p in by_id.values())
    trains = _get(mock_client, STATIONS, StationsResponse, type="train")["features"]
    assert [f["properties"]["station_id"] for f in trains] == ["mock:gare-saint-jean"]


def test_stations_area_and_limit(mock_client):
    metropole = _get(mock_client, STATIONS, StationsResponse)
    gironde = _get(mock_client, STATIONS, StationsResponse, area="gironde")
    ids = {f["properties"]["station_id"] for f in gironde["features"]}
    assert "mock:libourne-gare" in ids
    assert gironde["meta"]["total_features"] == metropole["meta"]["total_features"] + 1
    limited = _get(mock_client, STATIONS, StationsResponse, limit=1)
    assert limited["meta"]["truncated"] is True and len(limited["features"]) == 1


def test_real_station_ids_are_namespaced(real_client):
    ids = [f["properties"]["station_id"] for f in _get(real_client, STATIONS, StationsResponse)["features"]]
    assert ids == ["gbfs:r2:C1", "gtfs:r1:S1"]


def test_mock_summary(mock_client):
    coverage = _get(mock_client, COVERAGE, CoverageResponse)["features"]
    body = _get(mock_client, SUMMARY, SummaryResponse)
    assert body["population_total"] == sum(f["properties"]["population"] or 0 for f in coverage)
    assert body["zones_count"] == len(coverage)
    assert body["masked_zones_count"] == sum(f["properties"]["is_estimated"] for f in coverage) == 1
    assert len(body["stations_by_type"]) == 10
    assert body["citiz"]["stations_count"] == 1
    assert body["citiz"]["population_within_5min"] is None
    assert body["population_by_coverage_level"] is None
    assert body["population_with_any_option"] is None
    assert body["meta"]["coverage_thresholds"] is None


def test_mock_population_stats(mock_client):
    levels = _get(mock_client, POPULATION, PopulationStatsResponse)
    assert levels["available"] is False and levels["groups"] == []
    communes = _get(mock_client, POPULATION, PopulationStatsResponse, group_by="commune")
    assert communes["available"] is True and communes["additive"] is True
    assert sum(g["population"] for g in communes["groups"]) == communes["population_total"]
    assert {g["key"] for g in communes["groups"]} == {"33063", "33281"}


def test_real_statistics_are_consistent(real_client):
    summary = _get(real_client, SUMMARY, SummaryResponse)
    levels = _get(real_client, POPULATION, PopulationStatsResponse)
    assert levels["available"] is True and levels["additive"] is True
    by_level = {g["key"]: g["population"] for g in levels["groups"]}
    assert by_level == summary["population_by_coverage_level"]
    assert sum(by_level.values()) == summary["population_total"] == levels["population_total"] == 1000
    assert summary["population_with_any_option"] == 900
    assert summary["citiz"]["population_within_5min"] == 400
    assert summary["citiz"]["population_within_5min_share"] == 0.4
    assert summary["meta"]["coverage_thresholds"] == {"low_max": 2, "medium_max": 4}

    types = _get(real_client, POPULATION, PopulationStatsResponse, group_by="station_type")
    assert types["additive"] is False
    assert {g["key"]: g["population"] for g in types["groups"]} == {"bus": 900, "tram": 600, "citiz": 400}


def test_mock_recommendations_are_unavailable(mock_client):
    response = mock_client.post(RECOMMENDATIONS, json={"budget": 100_000})
    assert response.status_code == 200
    body = RecommendationResponse.model_validate(response.json()).model_dump()
    assert body["recommendations"] == []
    assert body["total_cost"] == 0
    assert body["remaining_budget"] == 100_000
    assert body["meta"]["recommendations_available"] is False


def test_recommendations_greedy_within_budget(greedy_client):
    body = greedy_client.post(RECOMMENDATIONS, json={"budget": 350}).json()
    assert [r["location_id"] for r in body["recommendations"]] == ["cand-a", "cand-c"]
    assert [r["rank"] for r in body["recommendations"]] == [1, 2]
    assert body["total_cost"] == 300
    assert body["remaining_budget"] == 50
    assert body["total_population_gained"] == 90


def test_recommendations_max_results(greedy_client):
    body = greedy_client.post(RECOMMENDATIONS, json={"budget": 10_000, "max_results": 1}).json()
    assert [r["location_id"] for r in body["recommendations"]] == ["cand-a"]


@pytest.mark.parametrize("payload", [{"budget": 0}, {"budget": -5}, {}, {"budget": 10, "equipment_types": []},
                                     {"budget": 10, "equipment_types": ["rocket"]}, {"budget": 10, "max_results": 0}])
def test_invalid_recommendation_requests(mock_client, payload):
    assert mock_client.post(RECOMMENDATIONS, json=payload).status_code == 422


def test_dataset_without_candidates(client_for):
    client = client_for(replace(accessible_dataset(with_candidates=False), mode=DataMode.mock))
    body = client.post(RECOMMENDATIONS, json={"budget": 1000}).json()
    assert body["recommendations"] == []
    assert body["meta"]["recommendations_available"] is False
    assert body["meta"]["accessibility_available"] is True


def test_empty_dataset(client_for):
    client = client_for(Dataset(mode=DataMode.real, zones=(), stations=()))
    coverage = _get(client, COVERAGE, CoverageResponse)
    assert coverage["features"] == [] and coverage["meta"]["total_features"] == 0
    assert coverage["meta"]["accessibility_available"] is False
    assert _get(client, HEATMAP, HeatmapResponse)["value_range"] is None
    assert _get(client, STATIONS, StationsResponse)["features"] == []
    summary = _get(client, SUMMARY, SummaryResponse)
    assert summary["population_total"] == 0
    assert summary["citiz"]["stations_per_100k_inhabitants"] is None
    communes = _get(client, POPULATION, PopulationStatsResponse, group_by="commune")
    assert communes["groups"] == [] and communes["population_total"] == 0
    assert client.post(RECOMMENDATIONS, json={"budget": 100_000}).json()["recommendations"] == []


def test_invalid_bbox_on_every_get_endpoint(mock_client):
    for url in (COVERAGE, HEATMAP, STATIONS, SUMMARY, POPULATION):
        assert mock_client.get(url, params={"bbox": "1,2,3"}).status_code == 400


def test_bbox_restricts_area(mock_client):
    bbox = "-0.580,44.840,-0.570,44.850"
    total = _get(mock_client, SUMMARY, SummaryResponse)["zones_count"]
    restricted = _get(mock_client, SUMMARY, SummaryResponse, bbox=bbox)["zones_count"]
    assert 0 < restricted < total
