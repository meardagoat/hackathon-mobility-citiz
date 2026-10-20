from datetime import datetime, timezone

import pyarrow as pa
import pytest

from app.config import DataMode, Settings, settings_from_env
from app.coverage_levels import CoverageThresholds
from app.data import load_dataset
from app.data.models import EquipmentType, Perimeter
from app.data.prepared import DataLoadError, load_prepared
from app.station_types import StationSource, StationType
from tests.gold import CARREAUX, META, OFFRE_EXISTANTE, RECOMMANDATIONS, ZONE_IDS, write_gold, write_table


@pytest.fixture
def data_dir(tmp_path):
    return write_gold(tmp_path)


def _replace(columns: dict, column: str, index: int, value) -> dict:
    values = list(columns[column])
    values[index] = value
    return {**columns, column: values}


def _scenario_rows(perimeter: str, budget: int) -> list[int]:
    return [
        i for i, (p, b) in enumerate(zip(RECOMMANDATIONS["perimetre"], RECOMMANDATIONS["budget_scenario"]))
        if p == perimeter and b == budget
    ]


def test_load_published_tables(data_dir):
    ds = load_prepared(data_dir, CoverageThresholds(low_max=1, medium_max=3))
    assert ds.mode is DataMode.real
    assert len(ds.zones) == 3
    assert len(ds.stations) == 7
    assert len(ds.recommendations) == 12
    assert ds.candidates == ()
    assert ds.accessibility_available is True
    assert ds.recommendations_available is True
    assert ds.collected_at == datetime(2026, 10, 20, 7, 30, tzinfo=timezone.utc)
    assert ds.coverage_thresholds == CoverageThresholds(low_max=1, medium_max=3)


def test_zone_mapping(data_dir):
    zones = {z.zone_id: z for z in load_prepared(data_dir).zones}
    assert list(zones) == ZONE_IDS
    first, masked = zones[ZONE_IDS[0]], zones[ZONE_IDS[2]]
    assert first.population == 412
    assert first.is_estimated is False
    assert first.commune_codes == ("33063",)
    assert first.options_count == 6
    assert first.options_by_type == {
        StationType.bus: 2,
        StationType.tram: 1,
        StationType.metro: 0,
        StationType.train: 1,
        StationType.ferry: 0,
        StationType.bike: 1,
        StationType.citiz: 1,
    }
    assert first.accessibility_score is None
    assert masked.is_estimated is True
    assert masked.commune_codes == ("33069",)


def test_station_mapping_preserves_ids(data_dir):
    stations = load_prepared(data_dir).stations
    assert [s.station_id for s in stations] == OFFRE_EXISTANTE["id_station"]
    assert [s.type for s in stations] == [
        StationType.tram,
        StationType.bus,
        StationType.train,
        StationType.ferry,
        StationType.metro,
        StationType.bike,
        StationType.citiz,
    ]
    assert all(s.modes == (s.type,) for s in stations)
    assert [s.source for s in stations] == [StationSource.gtfs] * 5 + [StationSource.gbfs] * 2
    citiz = stations[-1]
    assert (citiz.name, citiz.operator, citiz.lon, citiz.lat) == ("Gambetta", "Citiz Bordeaux", -0.5806, 44.8412)
    assert citiz.population_served == 0
    assert citiz.capacity is None
    assert stations[0].population_served == OFFRE_EXISTANTE["pop_desservie"][0] - CARREAUX["population"][2]


def test_recommendation_mapping(data_dir):
    recommendations = load_prepared(data_dir).recommendations
    keys = [(r.perimeter, r.budget, r.rank) for r in recommendations]
    assert keys == sorted(keys, key=lambda k: (k[0].value, k[1], k[2]))
    first = recommendations[0]
    assert (first.perimeter, first.budget, first.rank) == (Perimeter.citiz, 100_000, 1)
    assert first.location_id == f"citiz_{ZONE_IDS[2]}"
    assert first.equipment_type is EquipmentType.citiz_station
    assert first.commune_code == "33069"
    assert (first.cost, first.cumulative_cost) == (34_000, 34_000)
    assert first.population_gained == 43 - CARREAUX["population"][2]
    assert (first.score, first.adequation, first.cars_avoided) == (100.0, 0.8, 8)
    types = {r.equipment_type for r in recommendations if r.perimeter is Perimeter.all_types}
    assert types == set(EquipmentType)


def test_loading_twice_gives_the_same_dataset(data_dir):
    first, second = load_prepared(data_dir), load_prepared(data_dir)
    assert first.zones == second.zones
    assert first.stations == second.stations
    assert first.recommendations == second.recommendations
    assert first.collected_at == second.collected_at


@pytest.mark.parametrize("name", ["carreaux", "offre_existante", "recommandations", "meta"])
def test_missing_file_is_an_error(data_dir, name):
    (data_dir / f"{name}.parquet").unlink()
    with pytest.raises(DataLoadError, match=f"missing prepared data file: .*{name}.parquet"):
        load_prepared(data_dir)


@pytest.mark.parametrize(
    ("name", "columns", "column"),
    [
        ("carreaux", CARREAUX, "donnee_masquee"),
        ("carreaux", CARREAUX, "nb_options"),
        ("offre_existante", OFFRE_EXISTANTE, "code_commune"),
        ("offre_existante", OFFRE_EXISTANTE, "pop_desservie"),
        ("recommandations", RECOMMANDATIONS, "cout_cumule_eur"),
        ("recommandations", RECOMMANDATIONS, "perimetre"),
        ("meta", META, "date_maj"),
    ],
)
def test_missing_column_is_an_error(data_dir, name, columns, column):
    write_table(data_dir, name, {k: v for k, v in columns.items() if k != column})
    with pytest.raises(DataLoadError, match=f"{name}.parquet is missing columns: \\['{column}'\\]"):
        load_prepared(data_dir)


@pytest.mark.parametrize(
    ("name", "columns", "column", "arrow_type"),
    [
        ("carreaux", CARREAUX, "population", pa.int64()),
        ("offre_existante", OFFRE_EXISTANTE, "nom", pa.string()),
        ("recommandations", RECOMMANDATIONS, "rang", pa.int64()),
    ],
)
def test_null_required_value_is_an_error(data_dir, name, columns, column, arrow_type):
    values = list(columns[column])
    values[1] = None
    write_table(data_dir, name, {**columns, column: pa.array(values, type=arrow_type)})
    with pytest.raises(DataLoadError, match=f"{name}.parquet row 1: required column '{column}' is null"):
        load_prepared(data_dir)


@pytest.mark.parametrize("zone_id", ["BAD_ID", "CRS3035RES1000mN2473000E3486000"])
def test_invalid_zone_id_is_an_error(data_dir, zone_id):
    write_table(data_dir, "carreaux", _replace(CARREAUX, "id_carreau", 1, zone_id))
    with pytest.raises(DataLoadError, match=f"carreaux.parquet row 1: .*{zone_id}"):
        load_prepared(data_dir)


def test_duplicate_zone_id_is_an_error(data_dir):
    write_table(data_dir, "carreaux", _replace(CARREAUX, "id_carreau", 1, ZONE_IDS[0]))
    with pytest.raises(DataLoadError, match="carreaux.parquet row 1: duplicate id_carreau"):
        load_prepared(data_dir)


@pytest.mark.parametrize("values", [[0, 0, 1], ["false", "false", "true"]])
def test_non_boolean_masking_flag_is_an_error(data_dir, values):
    write_table(data_dir, "carreaux", {**CARREAUX, "donnee_masquee": values})
    with pytest.raises(DataLoadError, match="'donnee_masquee' must be a boolean"):
        load_prepared(data_dir)


@pytest.mark.parametrize(
    ("column", "value", "message"),
    [
        ("population", -1, "'population' must be a non-negative integer"),
        ("nb_bus", 2.5, "'nb_bus' must be a non-negative integer"),
        ("nb_options", 7, "'nb_options' is 7 but the per-type columns sum to 6"),
        ("code_commune", "3306", "'code_commune' must be a 5-character INSEE code"),
    ],
)
def test_invalid_zone_value_is_an_error(data_dir, column, value, message):
    write_table(data_dir, "carreaux", _replace(CARREAUX, column, 0, value))
    with pytest.raises(DataLoadError, match=f"carreaux.parquet row 0: {message}"):
        load_prepared(data_dir)


def test_unknown_option_column_is_an_error(data_dir):
    write_table(data_dir, "carreaux", {**CARREAUX, "nb_funiculaire": [0, 0, 0]})
    with pytest.raises(DataLoadError, match="unknown station type 'funiculaire'"):
        load_prepared(data_dir)


def test_missing_option_column_for_a_present_station_type_is_an_error(data_dir):
    write_table(data_dir, "carreaux", {k: v for k, v in CARREAUX.items() if k != "nb_bateau"})
    with pytest.raises(DataLoadError, match="missing option columns .*\\['nb_bateau'\\]"):
        load_prepared(data_dir)


def test_unknown_station_type_is_an_error(data_dir):
    write_table(data_dir, "offre_existante", _replace(OFFRE_EXISTANTE, "type", 2, "funiculaire"))
    with pytest.raises(DataLoadError, match="offre_existante.parquet row 2: unknown station type 'funiculaire'"):
        load_prepared(data_dir)


@pytest.mark.parametrize("station_id", ["osm_123", "gtfs-123", "123"])
def test_unknown_station_id_prefix_is_an_error(data_dir, station_id):
    write_table(data_dir, "offre_existante", _replace(OFFRE_EXISTANTE, "id_station", 0, station_id))
    with pytest.raises(DataLoadError, match=f"offre_existante.parquet row 0: id_station must start with .*{station_id}"):
        load_prepared(data_dir)


def test_duplicate_station_id_is_an_error(data_dir):
    write_table(data_dir, "offre_existante", _replace(OFFRE_EXISTANTE, "id_station", 1, OFFRE_EXISTANTE["id_station"][0]))
    with pytest.raises(DataLoadError, match="offre_existante.parquet row 1: duplicate id_station"):
        load_prepared(data_dir)


def test_projected_coordinates_are_an_error(data_dir):
    write_table(data_dir, "offre_existante", _replace(OFFRE_EXISTANTE, "lon", 0, 3486700.0))
    with pytest.raises(DataLoadError, match="offre_existante.parquet row 0: lon/lat must be WGS84 degrees"):
        load_prepared(data_dir)


def test_rank_gap_is_an_error(data_dir):
    row = _scenario_rows("tous", 100_000)[2]
    write_table(data_dir, "recommandations", _replace(RECOMMANDATIONS, "rang", row, 4))
    with pytest.raises(DataLoadError, match="scenario tous/100000: ranks must run from 1 to 3 without gaps, got \\[1, 2, 4\\]"):
        load_prepared(data_dir)


def test_duplicate_rank_is_an_error(data_dir):
    row = _scenario_rows("citiz", 250_000)[2]
    write_table(data_dir, "recommandations", _replace(RECOMMANDATIONS, "rang", row, 2))
    with pytest.raises(DataLoadError, match="scenario citiz/250000: ranks must run .* got \\[1, 2, 2\\]"):
        load_prepared(data_dir)


def test_wrong_cumulative_cost_is_an_error(data_dir):
    row = _scenario_rows("tous", 250_000)[1]
    write_table(data_dir, "recommandations", _replace(RECOMMANDATIONS, "cout_cumule_eur", row, 34_000))
    with pytest.raises(DataLoadError, match="scenario tous/250000 rank 2: cout_cumule_eur is 34000, expected 49000"):
        load_prepared(data_dir)


def test_scenario_over_budget_is_an_error(data_dir):
    rows = _scenario_rows("tous", 100_000)
    columns = {**RECOMMANDATIONS, "budget_scenario": [
        60_000 if i in rows else b for i, b in enumerate(RECOMMANDATIONS["budget_scenario"])
    ]}
    write_table(data_dir, "recommandations", columns)
    with pytest.raises(DataLoadError, match="scenario tous/60000: total cost 64000 exceeds the budget"):
        load_prepared(data_dir)


def test_duplicate_candidate_in_scenario_is_an_error(data_dir):
    rows = _scenario_rows("citiz", 100_000)
    duplicate = RECOMMANDATIONS["id_candidat"][rows[0]]
    write_table(data_dir, "recommandations", _replace(RECOMMANDATIONS, "id_candidat", rows[1], duplicate))
    with pytest.raises(DataLoadError, match="scenario citiz/100000 row 1: duplicate id_candidat"):
        load_prepared(data_dir)


@pytest.mark.parametrize(
    ("column", "value", "message"),
    [
        ("perimetre", "velo", "'velo' is not a valid Perimeter"),
        ("type", "tram", "unknown equipment type 'tram'"),
        ("adequation", 1.5, "'adequation' must be between 0 and 1"),
        ("cout_eur", 34_000.5, "'cout_eur' must be a non-negative integer"),
    ],
)
def test_invalid_recommendation_value_is_an_error(data_dir, column, value, message):
    write_table(data_dir, "recommandations", _replace(RECOMMANDATIONS, column, 0, value))
    with pytest.raises(DataLoadError, match=f"recommandations.parquet row 0: {message}"):
        load_prepared(data_dir)


def test_equipment_outside_perimeter_is_an_error(data_dir):
    row = _scenario_rows("citiz", 100_000)[0]
    write_table(data_dir, "recommandations", _replace(RECOMMANDATIONS, "type", row, "velo"))
    with pytest.raises(DataLoadError, match=f"row {row}: equipment type 'velo' is outside perimeter 'citiz'"):
        load_prepared(data_dir)


@pytest.mark.parametrize(
    ("value", "message"),
    [("2026-10-20T07:30:00", "must include a timezone"), ("yesterday", "Invalid isoformat")],
)
def test_invalid_update_date_is_an_error(data_dir, value, message):
    write_table(data_dir, "meta", {**META, "date_maj": [value]})
    with pytest.raises(DataLoadError, match=f"meta.parquet row 0: .*{message}"):
        load_prepared(data_dir)


def test_empty_meta_is_an_error(data_dir):
    write_table(data_dir, "meta", {"date_maj": pa.array([], type=pa.string()), "rayon_m": pa.array([], type=pa.int64())})
    with pytest.raises(DataLoadError, match="meta.parquet has no rows"):
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
