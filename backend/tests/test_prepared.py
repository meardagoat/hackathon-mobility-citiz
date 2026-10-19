import logging
from datetime import datetime, timezone

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from app.config import DataMode, Settings, settings_from_env
from app.coverage_levels import CoverageThresholds
from app.data import load_dataset
from app.data.models import EquipmentType
from app.data.prepared import DataLoadError, load_prepared
from app.station_types import StationSource, StationType

ZONES = {
    "zone_id": ["CRS3035RES200mN2473800E3486600", "CRS3035RES200mN2473800E3486800"],
    "population": [412.4, 0.6],
    "is_estimated": [False, True],
    "commune_codes": [["33063"], ["33063", "33069"]],
    "date_collecte": ["2026-10-19T08:00:00Z", "2026-10-19T09:00:00Z"],
}

STATIONS = {
    "source": ["gtfs", "gtfs", "gbfs", "gbfs"],
    "resource_id": ["81234", "81234", "555", "556"],
    "native_id": ["BDX:1", "BDX:2", "st-1", "st-2"],
    "name": ["Stop 1", "Stop 2", "Citiz A", "Bike B"],
    "operator": ["TBM", "TBM", "Citiz", "V3"],
    "lon": [-0.5745, -0.5750, -0.5720, -0.5730],
    "lat": [44.8445, 44.8440, 44.8452, 44.8448],
    "route_types": [["3", "0"], ["99"], None, None],
    "form_factors": [None, None, ["car"], ["bicycle", "hoverboard"]],
    "is_citiz": [None, None, True, False],
    "capacity": [None, None, 2, 20],
}

CANDIDATES = {
    "location_id": ["cand-a"],
    "equipment_type": ["bus_stop"],
    "lon": [-0.5745],
    "lat": [44.8445],
    "cost": [100.0],
    "population_gained": [50],
    "estimated_value": [5.0],
}


def _write(path, columns):
    pq.write_table(pa.table(columns), path)


@pytest.fixture
def data_dir(tmp_path):
    _write(tmp_path / "zones.parquet", ZONES)
    _write(tmp_path / "stations.parquet", STATIONS)
    return tmp_path


def test_load_prepared_without_accessibility_or_candidates(data_dir):
    ds = load_prepared(data_dir)
    assert ds.mode is DataMode.real
    assert len(ds.zones) == 2
    assert ds.zones[1].commune_codes == ("33063", "33069")
    assert ds.accessibility_available is False
    assert ds.recommendations_available is False
    assert ds.collected_at == datetime(2026, 10, 19, 9, tzinfo=timezone.utc)


def test_station_mapping_ids_and_unknown_types(data_dir, caplog):
    with caplog.at_level(logging.WARNING):
        ds = load_prepared(data_dir)
    stations = {s.station_id: s for s in ds.stations}
    assert set(stations) == {"gtfs:81234:BDX:1", "gtfs:81234:BDX:2", "gbfs:555:st-1", "gbfs:556:st-2"}
    assert stations["gtfs:81234:BDX:1"].modes == (StationType.tram, StationType.bus)
    assert stations["gtfs:81234:BDX:1"].type is StationType.tram
    assert stations["gtfs:81234:BDX:2"].type is StationType.other
    assert stations["gbfs:555:st-1"].type is StationType.citiz
    assert stations["gbfs:556:st-2"].modes == (StationType.bike, StationType.other)
    assert stations["gbfs:556:st-2"].source is StationSource.gbfs
    assert stations["gbfs:556:st-2"].capacity == 20
    assert "gtfs route_type 99" in caplog.text and "gbfs form_factor hoverboard" in caplog.text


def test_load_prepared_with_accessibility_and_candidates(data_dir):
    _write(data_dir / "zones.parquet", {
        **ZONES,
        "options_count": [3, 0],
        "options_bus": [2, 0],
        "options_tram": [1, 0],
        "accessibility_score": [0.7, 0.0],
    })
    _write(data_dir / "candidates.parquet", CANDIDATES)
    ds = load_prepared(data_dir, CoverageThresholds(low_max=1, medium_max=3))
    assert ds.accessibility_available is True
    assert ds.zones[0].options_by_type == {StationType.bus: 2, StationType.tram: 1}
    assert ds.recommendations_available is True
    assert ds.candidates[0].equipment_type is EquipmentType.bus_stop
    assert ds.coverage_thresholds == CoverageThresholds(low_max=1, medium_max=3)


def test_missing_file_is_an_error(tmp_path):
    with pytest.raises(DataLoadError, match="zones.parquet"):
        load_prepared(tmp_path)


def test_missing_column_is_an_error(data_dir):
    _write(data_dir / "stations.parquet", {k: v for k, v in STATIONS.items() if k != "operator"})
    with pytest.raises(DataLoadError, match="operator"):
        load_prepared(data_dir)


def test_unknown_source_is_an_error(data_dir):
    _write(data_dir / "stations.parquet", {**STATIONS, "source": ["gtfs", "gtfs", "gbfs", "osm"]})
    with pytest.raises(DataLoadError, match="osm"):
        load_prepared(data_dir)


def test_load_dataset_modes(data_dir):
    assert load_dataset(Settings()).mode is DataMode.mock
    assert load_dataset(Settings(data_mode=DataMode.real, data_dir=data_dir)).mode is DataMode.real


def test_settings_from_env(monkeypatch, tmp_path):
    monkeypatch.setenv("DATA_MODE", "real")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.setenv("COVERAGE_LOW_MAX", "2")
    monkeypatch.setenv("COVERAGE_MEDIUM_MAX", "5")
    settings = settings_from_env()
    assert settings.data_mode is DataMode.real
    assert settings.data_dir == tmp_path
    assert settings.coverage_thresholds == CoverageThresholds(low_max=2, medium_max=5)


def test_settings_reject_partial_thresholds(monkeypatch):
    monkeypatch.setenv("COVERAGE_LOW_MAX", "2")
    monkeypatch.delenv("COVERAGE_MEDIUM_MAX", raising=False)
    with pytest.raises(ValueError):
        settings_from_env()


def test_settings_reject_unknown_mode(monkeypatch):
    monkeypatch.setenv("DATA_MODE", "fabric")
    with pytest.raises(ValueError):
        settings_from_env()
