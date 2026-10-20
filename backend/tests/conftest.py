from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app.config import DataMode
from app.coverage_levels import CoverageThresholds
from app.data import get_dataset
from app.data.mock import mock_dataset
from app.data.models import Candidate, Dataset, EquipmentType, Perimeter, PrecomputedRecommendation, Station, Zone
from app.main import app
from app.station_types import StationSource, StationType

BORDEAUX = "33063"
LIBOURNE = "33243"


def make_zone(north: int, east: int, population: float, options: dict[StationType, int] | None = None,
              score: float | None = None, commune: str = BORDEAUX) -> Zone:
    return Zone(
        zone_id=f"CRS3035RES200mN{north}E{east}",
        population=population,
        is_estimated=False,
        commune_codes=(commune,),
        options_count=None if options is None else sum(options.values()),
        options_by_type=options,
        accessibility_score=score,
    )


def accessible_dataset(with_candidates: bool = True) -> Dataset:
    zones = (
        make_zone(2473800, 3486600, 400, {StationType.bus: 3, StationType.tram: 2, StationType.citiz: 1}, 0.9),
        make_zone(2473800, 3486800, 300, {StationType.bus: 1, StationType.tram: 0, StationType.citiz: 0}, 0.3),
        make_zone(2474000, 3486600, 200, {StationType.bus: 2, StationType.tram: 1, StationType.citiz: 0}, 0.5),
        make_zone(2474000, 3486800, 100, {StationType.bus: 0, StationType.tram: 0, StationType.citiz: 0}, 0.0),
        make_zone(2478000, 3514000, 50, {StationType.bus: 0, StationType.tram: 0, StationType.citiz: 0}, 0.0,
                  commune=LIBOURNE),
    )
    stations = (
        Station("gtfs:r1:S1", "Stop 1", (StationType.tram, StationType.bus), StationType.tram, "TBM",
                StationSource.gtfs, -0.5745, 44.8445, BORDEAUX),
        Station("gbfs:r2:C1", "Citiz 1", (StationType.citiz,), StationType.citiz, "Citiz",
                StationSource.gbfs, -0.5720, 44.8452, BORDEAUX, capacity=2),
    )
    candidates = (
        Candidate("cand-a", EquipmentType.bus_stop, -0.5745, 44.8445, 100.0, 50, 5.0, BORDEAUX),
        Candidate("cand-b", EquipmentType.citiz_station, -0.5720, 44.8452, 300.0, 80, 6.0, BORDEAUX),
        Candidate("cand-c", EquipmentType.bike_station, -0.5730, 44.8448, 200.0, 40, 1.0, BORDEAUX),
    ) if with_candidates else ()
    recommendations = (
        PrecomputedRecommendation(Perimeter.citiz, 100_000, 1, "citiz_cell", EquipmentType.citiz_station,
                                  -0.5720, 44.8452, BORDEAUX, 34_000, 34_000, 120, 100.0, 0.7, 8),
    ) if with_candidates else ()
    return Dataset(
        mode=DataMode.real,
        zones=zones,
        stations=stations,
        candidates=candidates,
        recommendations=recommendations,
        coverage_thresholds=CoverageThresholds(low_max=2, medium_max=4),
    )


@pytest.fixture
def client_for():
    def _client(dataset: Dataset) -> TestClient:
        app.dependency_overrides[get_dataset] = lambda: dataset
        return TestClient(app)

    yield _client
    app.dependency_overrides.clear()


@pytest.fixture
def mock_client(client_for):
    return client_for(mock_dataset())


@pytest.fixture
def real_client(client_for):
    return client_for(accessible_dataset())


@pytest.fixture
def greedy_client(client_for):
    return client_for(replace(accessible_dataset(), mode=DataMode.mock))
