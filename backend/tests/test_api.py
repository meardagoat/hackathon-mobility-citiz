from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_coverage_is_geojson():
    response = client.get("/api/v1/mobility/coverage")
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert body["features"]
    for feature in body["features"]:
        assert feature["geometry"]["type"] == "Polygon"
        props = feature["properties"]
        assert {"zone_id", "population", "options_count", "accessibility_score"} <= props.keys()
        assert 0 <= props["accessibility_score"] <= 1


def test_coverage_bbox_filters_and_validates():
    all_zones = client.get("/api/v1/mobility/coverage").json()["features"]
    some_zones = client.get("/api/v1/mobility/coverage", params={"bbox": "7.735,48.575,7.741,48.579"}).json()["features"]
    assert 0 < len(some_zones) < len(all_zones)
    assert client.get("/api/v1/mobility/coverage", params={"bbox": "nope"}).status_code == 400


def test_stations_filter_by_type():
    response = client.get("/api/v1/stations", params=[("type", "citiz"), ("type", "tram")])
    assert response.status_code == 200
    types = {f["properties"]["type"] for f in response.json()["features"]}
    assert types == {"citiz", "tram"}


def test_stations_unknown_type_is_rejected():
    assert client.get("/api/v1/stations", params={"type": "rocket"}).status_code == 422


def test_recommendations_respect_budget():
    response = client.post("/api/v1/recommendations", json={"budget": 50_000})
    assert response.status_code == 200
    body = response.json()
    assert body["total_cost"] <= body["budget"]
    assert body["remaining_budget"] == body["budget"] - body["total_cost"]
    assert [r["rank"] for r in body["recommendations"]] == list(range(1, len(body["recommendations"]) + 1))


def test_recommendations_filter_by_equipment_type():
    response = client.post("/api/v1/recommendations", json={"budget": 1_000_000, "equipment_types": ["bus_stop"]})
    assert {r["equipment_type"] for r in response.json()["recommendations"]} == {"bus_stop"}


def test_recommendations_invalid_budget():
    assert client.post("/api/v1/recommendations", json={"budget": -1}).status_code == 422
