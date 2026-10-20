"""Tests on the data team's sample exports (backend/fixtures/data_team, not versioned).

The samples are a subset of the Fabric outputs: they check formats and API behaviour, not the full Lakehouse."""
import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from app.coverage_levels import CoverageThresholds
from app.data.models import EquipmentType, Perimeter
from app.data.prepared import (
    META_COLUMNS,
    RECOMMENDATION_COLUMNS,
    STATION_COLUMNS,
    ZONE_COLUMNS,
    DataLoadError,
    load_prepared,
)
from app.schemas import (
    CoverageResponse,
    HeatmapResponse,
    PopulationStatsResponse,
    RecommendationResponse,
    StationsResponse,
    SummaryResponse,
)
from app.station_types import StationSource, StationType

SAMPLES = Path(__file__).resolve().parents[1] / "fixtures" / "data_team"
TABLES = ("carreaux", "offre_existante", "recommandations", "meta")
THRESHOLDS = CoverageThresholds(low_max=2, medium_max=5)
BUDGETS = (100_000, 250_000, 500_000, 1_000_000)
EQUIPMENT = {"tous": ["citiz_station", "bus_stop", "bike_station"], "citiz": ["citiz_station"]}
IMPUTED_POPULATION = 987_654
IMPUTED_RATIO = 0.123457

pytestmark = pytest.mark.skipif(not SAMPLES.is_dir(), reason="data team samples not available")


def _table(name: str) -> pa.Table:
    return pq.read_table(SAMPLES / f"{name}.parquet")


def _copy_samples(directory: Path) -> Path:
    for name in TABLES:
        shutil.copy(SAMPLES / f"{name}.parquet", directory / f"{name}.parquet")
    return directory


def _rewrite(directory: Path, name: str, change) -> None:
    table = pq.read_table(directory / f"{name}.parquet")
    columns = table.to_pydict()
    change(columns)
    pq.write_table(pa.Table.from_pydict(columns, schema=table.schema), directory / f"{name}.parquet")


def _masked_rows(columns: dict) -> list[int]:
    return [i for i, masked in enumerate(columns["donnee_masquee"]) if masked]


@pytest.fixture(scope="module")
def samples():
    return load_prepared(SAMPLES, THRESHOLDS)


@pytest.fixture
def sample_client(client_for, samples):
    return client_for(samples)


def _snapshot(client) -> list[str]:
    masked = next(r for r in json.loads((SAMPLES / "carreaux.json").read_text()) if r["donnee_masquee"])
    around = f"{masked['lon'] - 0.003},{masked['lat'] - 0.003},{masked['lon'] + 0.003},{masked['lat'] + 0.003}"
    gets = [
        ("/api/v1/mobility/coverage", {}),
        ("/api/v1/mobility/coverage", {"bbox": around}),
        ("/api/v1/mobility/coverage", {"limit": 5}),
        ("/api/v1/mobility/coverage", {"coverage_level": ["low", "medium"]}),
        *[("/api/v1/mobility/heatmap", {"metric": m, "resolution": r, **b})
          for m in ("population", "underserved_population", "accessibility_score")
          for r in ("200m", "1km") for b in ({}, {"bbox": around})],
        ("/api/v1/stations", {}),
        ("/api/v1/stations", {"bbox": around}),
        ("/api/v1/statistics/summary", {}),
        ("/api/v1/statistics/summary", {"bbox": around}),
        *[("/api/v1/statistics/population", {"group_by": g, **b})
          for g in ("coverage_level", "commune", "station_type") for b in ({}, {"bbox": around})],
    ]
    texts = []
    for url, params in gets:
        response = client.get(url, params=params)
        assert response.status_code == 200, (url, params, response.text)
        texts.append(response.text)
    for perimeter, types in EQUIPMENT.items():
        for budget in BUDGETS:
            response = client.post("/api/v1/recommendations", json={"budget": budget, "equipment_types": types})
            assert response.status_code == 200, response.text
            texts.append(response.text)
    return texts


def test_sample_schemas_cover_the_loader_contract():
    for name, required in (("carreaux", ZONE_COLUMNS), ("offre_existante", STATION_COLUMNS),
                           ("recommandations", RECOMMENDATION_COLUMNS), ("meta", META_COLUMNS)):
        table = _table(name)
        assert required <= set(table.column_names), name
        assert all(table.column(c).null_count == 0 for c in required), name
    carreaux = _table("carreaux").schema
    assert carreaux.field("population").type == pa.int64()
    assert carreaux.field("donnee_masquee").type == pa.bool_()
    assert carreaux.field("id_carreau").type == pa.large_string()
    assert _table("recommandations").schema.field("pop_nouvelle").type == pa.int64()
    assert _table("offre_existante").schema.field("pop_desservie").type == pa.int64()


def test_json_export_masks_what_parquet_keeps():
    exported = json.loads((SAMPLES / "carreaux.json").read_text())
    parquet = _table("carreaux").to_pydict()
    assert [r["id_carreau"] for r in exported] == parquet["id_carreau"]
    for i in _masked_rows(parquet):
        assert exported[i]["population"] is None and exported[i]["options_par_habitant"] is None
        assert parquet["population"][i] is not None and parquet["options_par_habitant"][i] is not None


def test_samples_load(samples, caplog):
    assert (len(samples.zones), len(samples.stations), len(samples.recommendations)) == (93, 88, 112)
    assert samples.collected_at == datetime(2026, 10, 20, 8, 24, 8, tzinfo=timezone.utc)
    assert sum(z.is_estimated for z in samples.zones) == 30
    assert samples.recommendations_available is True
    with caplog.at_level(logging.WARNING):
        load_prepared(SAMPLES)
    assert "pop_nouvelle could not be reproduced" in caplog.text


def test_sample_station_mapping(samples):
    published = _table("offre_existante").to_pydict()
    assert [s.station_id for s in samples.stations] == published["id_station"]
    assert {s.type for s in samples.stations} == {
        StationType.bus, StationType.tram, StationType.ferry, StationType.bike, StationType.citiz,
    }
    for station, kind in zip(samples.stations, published["type"]):
        assert station.modes == (station.type,)
        assert station.source is (StationSource.gtfs if station.station_id.startswith("gtfs_") else StationSource.gbfs)
        assert station.capacity is None
        assert {"bateau": "ferry", "velo": "bike"}.get(kind, kind) == station.type.value


def test_sample_recommendation_mapping(samples):
    published = _table("recommandations").to_pydict()
    scenarios = {(r.perimeter, r.budget) for r in samples.recommendations}
    assert scenarios == {(p, b) for p in Perimeter for b in BUDGETS}
    assert {r.equipment_type for r in samples.recommendations} == {EquipmentType.bus_stop, EquipmentType.citiz_station}
    by_key = {(p, b, k): (i, c) for p, b, k, i, c in zip(published["perimetre"], published["budget_scenario"],
                                                         published["rang"], published["id_candidat"],
                                                         published["cout_cumule_eur"])}
    for r in samples.recommendations:
        assert by_key[(r.perimeter.value, r.budget, r.rank)] == (r.location_id, r.cumulative_cost)


@pytest.mark.parametrize("budget", BUDGETS)
@pytest.mark.parametrize("perimeter", ["tous", "citiz"])
def test_sample_recommendations_served_in_rank_order(sample_client, perimeter, budget):
    response = sample_client.post("/api/v1/recommendations",
                                  json={"budget": budget, "equipment_types": EQUIPMENT[perimeter]})
    body = RecommendationResponse.model_validate(response.json()).model_dump(mode="json")
    published = _table("recommandations").to_pydict()
    expected = sorted((k, i) for p, b, k, i in zip(published["perimetre"], published["budget_scenario"],
                                                   published["rang"], published["id_candidat"])
                      if p == perimeter and b == budget)
    expected = expected[:20]
    assert [(r["rank"], r["location_id"]) for r in body["recommendations"]] == expected
    assert body["perimeter"] == perimeter
    assert all(r["estimated_value"] is None and 0 <= r["score"] <= 100 for r in body["recommendations"])
    assert body["total_cost"] <= budget
    if perimeter == "tous":
        assert body["total_population_gained"] is None
    else:
        assert body["total_population_gained"] == body["population_gained_by_type"]["citiz_station"]


def test_impacts_match_recommendations():
    impacts = _table("impacts").to_pydict()
    published = _table("recommandations").to_pydict()
    for perimeter, budget, count, cost, people in zip(impacts["perimetre"], impacts["budget_eur"],
                                                      impacts["nb_equipements"], impacts["cout_eur"],
                                                      impacts["habitants_nouvellement_servis"]):
        rows = [i for i, (p, b) in enumerate(zip(published["perimetre"], published["budget_scenario"]))
                if p == perimeter and b == budget]
        assert len(rows) == count
        assert max(published["cout_cumule_eur"][i] for i in rows) == cost
        assert sum(published["pop_nouvelle"][i] for i in rows) == people


@pytest.mark.parametrize(("url", "model"), [
    ("/api/v1/mobility/coverage", CoverageResponse),
    ("/api/v1/mobility/heatmap", HeatmapResponse),
    ("/api/v1/stations", StationsResponse),
    ("/api/v1/statistics/summary", SummaryResponse),
    ("/api/v1/statistics/population", PopulationStatsResponse),
])
def test_sample_responses_match_their_schema(sample_client, url, model):
    response = sample_client.get(url)
    assert response.status_code == 200
    model.model_validate(response.json())


def test_masked_squares_have_no_population_in_coverage(sample_client):
    features = sample_client.get("/api/v1/mobility/coverage").json()["features"]
    masked = [f["properties"] for f in features if f["properties"]["is_estimated"]]
    assert len(masked) == 30
    assert all(p["population"] is None and p["options_per_1000_inhabitants"] is None for p in masked)
    assert all(p["options_count"] is not None and p["coverage_level"] is not None for p in masked)
    assert [f["properties"]["is_estimated"] for f in features] == sorted(f["properties"]["is_estimated"] for f in features)


def test_imputed_values_cannot_be_recovered(client_for, tmp_path):
    original, altered = tmp_path / "original", tmp_path / "altered"
    original.mkdir()
    altered.mkdir()
    baseline = _snapshot(client_for(load_prepared(_copy_samples(original), THRESHOLDS)))
    _copy_samples(altered)

    def imputed(columns):
        for i in _masked_rows(columns):
            columns["population"][i] = IMPUTED_POPULATION + i
            columns["options_par_habitant"][i] = IMPUTED_RATIO

    def distinctive_served(columns):
        columns["pop_desservie"] = [IMPUTED_POPULATION + i for i in range(len(columns["pop_desservie"]))]

    def distinctive_gains(columns):
        columns["pop_nouvelle"] = [IMPUTED_POPULATION + i for i in range(len(columns["pop_nouvelle"]))]

    _rewrite(altered, "carreaux", imputed)
    _rewrite(altered, "offre_existante", distinctive_served)
    _rewrite(altered, "recommandations", distinctive_gains)
    leaked = _snapshot(client_for(load_prepared(altered, THRESHOLDS)))

    assert leaked == baseline
    text = "".join(leaked)
    assert str(IMPUTED_POPULATION) not in text and str(IMPUTED_RATIO) not in text


def test_population_totals_exclude_masked_squares(sample_client, samples):
    visible = sum(round(z.population) for z in samples.zones if not z.is_estimated)
    summary = sample_client.get("/api/v1/statistics/summary").json()
    assert summary["population_total"] == visible
    assert summary["masked_zones_count"] == 30
    communes = sample_client.get("/api/v1/statistics/population", params={"group_by": "commune"}).json()
    assert sum(g["population"] for g in communes["groups"]) == visible
    assert sum(g["masked_zones_count"] for g in communes["groups"]) == communes["masked_zones_count"] == 30
    heatmap = sample_client.get("/api/v1/mobility/heatmap").json()
    assert sum(p[2] for p in heatmap["points"]) == visible
    assert len(heatmap["points"]) == len(samples.zones) - 30


@pytest.mark.parametrize(("method", "url", "kwargs", "loc"), [
    ("get", "/api/v1/stations", {"params": {"area": "gironde"}}, ["query", "area"]),
    ("post", "/api/v1/recommendations", {"json": {"budget": 300_000}}, ["body", "budget"]),
    ("post", "/api/v1/recommendations", {"json": {"budget": 100_000, "equipment_types": ["bus_stop"]}},
     ["body", "equipment_types"]),
    ("post", "/api/v1/recommendations", {"json": {"budget": 100_000, "area": "gironde"}}, ["body", "area"]),
])
def test_sample_rejects_unsupported_requests(sample_client, method, url, kwargs, loc):
    response = getattr(sample_client, method)(url, **kwargs)
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == loc


@pytest.mark.parametrize("name", TABLES)
def test_missing_sample_table_is_an_error(tmp_path, name):
    _copy_samples(tmp_path)
    (tmp_path / f"{name}.parquet").unlink()
    with pytest.raises(DataLoadError, match=f"missing prepared data file: .*{name}.parquet"):
        load_prepared(tmp_path)


def test_sample_with_a_dropped_column_is_an_error(tmp_path):
    _copy_samples(tmp_path)
    table = pq.read_table(tmp_path / "carreaux.parquet")
    pq.write_table(table.drop_columns(["donnee_masquee"]), tmp_path / "carreaux.parquet")
    with pytest.raises(DataLoadError, match="carreaux.parquet is missing columns: \\['donnee_masquee'\\]"):
        load_prepared(tmp_path)


def test_empty_recommendation_table_gives_valid_empty_responses(client_for, tmp_path):
    _copy_samples(tmp_path)
    table = pq.read_table(tmp_path / "recommandations.parquet")
    pq.write_table(table.slice(0, 0), tmp_path / "recommandations.parquet")
    ds = load_prepared(tmp_path)
    assert ds.recommendations == () and ds.recommendations_available is False
    body = client_for(ds).post("/api/v1/recommendations", json={"budget": 100_000}).json()
    RecommendationResponse.model_validate(body)
    assert body["recommendations"] == [] and body["meta"]["recommendations_available"] is False
