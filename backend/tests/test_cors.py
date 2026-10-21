import importlib

import pytest
from fastapi.testclient import TestClient

import app.main

FRONTEND = "http://localhost:3000"


@pytest.fixture
def client():
    return TestClient(app.main.app)


def test_local_frontend_can_call_the_api(client):
    response = client.get("/health", headers={"Origin": FRONTEND})
    assert response.headers["access-control-allow-origin"] == FRONTEND


def test_local_frontend_preflight_for_recommendations(client):
    response = client.options("/api/v1/recommendations", headers={
        "Origin": FRONTEND,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND
    assert "POST" in response.headers["access-control-allow-methods"]


@pytest.mark.parametrize("origin", ["https://example.com", "http://localhost.example.com", "https://localhost:3000"])
def test_other_origins_are_not_allowed(client, origin):
    response = client.get("/health", headers={"Origin": origin})
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_adds_deployed_frontends(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://citiz.example.org,https://preview.example.org")
    try:
        client = TestClient(importlib.reload(app.main).app)
        for origin in ("https://citiz.example.org", "https://preview.example.org"):
            assert client.get("/health", headers={"Origin": origin}).headers["access-control-allow-origin"] == origin
        assert "access-control-allow-origin" not in client.get("/health", headers={"Origin": "https://other.org"}).headers
    finally:
        monkeypatch.delenv("CORS_ORIGINS")
        importlib.reload(app.main)
