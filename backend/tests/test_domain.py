from collections import Counter

import pytest

from app.areas import Area, BORDEAUX_METROPOLE_COMMUNES, in_area
from app.coverage_levels import CoverageLevel, CoverageThresholds, classify
from app.geo import parent_cell, parse_cell_id, square_centre, square_polygon
from app.station_types import (
    StationSource,
    StationType,
    gbfs_modes,
    gtfs_modes,
    gtfs_route_type,
    primary_type,
    station_id,
)

BORDEAUX_CELL = "CRS3035RES200mN2473800E3486600"


@pytest.mark.parametrize(
    ("code", "expected"),
    [
        ("0", StationType.tram),
        ("1", StationType.metro),
        ("2", StationType.train),
        ("3", StationType.bus),
        ("4", StationType.ferry),
        (109, StationType.train),
        ("202", StationType.bus),
        ("715", StationType.bus),
        ("900", StationType.tram),
        ("1200", StationType.ferry),
    ],
)
def test_gtfs_route_type_mapping(code, expected):
    assert gtfs_route_type(code) is expected


@pytest.mark.parametrize("code", ["6", "1700", "", "abc", None])
def test_unknown_gtfs_route_type_maps_to_other_and_is_counted(code):
    unknown = Counter()
    assert gtfs_route_type(code, unknown) is StationType.other
    assert sum(unknown.values()) == 1


def test_gbfs_modes():
    assert gbfs_modes(["bicycle", "cargo_bicycle"], is_citiz=False) == (StationType.bike,)
    assert gbfs_modes(["scooter_standing"], is_citiz=False) == (StationType.scooter,)
    assert gbfs_modes(["car"], is_citiz=False) == (StationType.carsharing,)
    assert gbfs_modes(["car"], is_citiz=True) == (StationType.citiz,)
    assert gbfs_modes([], is_citiz=True) == (StationType.citiz,)


def test_unknown_gbfs_form_factor_maps_to_other():
    unknown = Counter()
    assert gbfs_modes(["hoverboard"], is_citiz=False, unknown=unknown) == (StationType.other,)
    assert unknown == Counter({"gbfs form_factor hoverboard": 1})


def test_multiple_modes_and_primary_type():
    modes = gtfs_modes(["3", "0", "3"])
    assert modes == (StationType.tram, StationType.bus)
    assert primary_type(modes) is StationType.tram
    assert primary_type([]) is StationType.other


def test_namespaced_station_ids():
    assert station_id(StationSource.gtfs, "81234", "BDX:1") == "gtfs:81234:BDX:1"
    assert station_id(StationSource.gbfs, "555", "st-9") == "gbfs:555:st-9"
    assert station_id(StationSource.mock, "", "quinconces") == "mock:quinconces"


def test_classify_without_thresholds_is_unknown():
    assert classify(3, None) is None
    assert classify(None, CoverageThresholds(2, 5)) is None


def test_classify_with_thresholds():
    thresholds = CoverageThresholds(low_max=2, medium_max=5)
    assert [classify(n, thresholds) for n in (0, 1, 2, 3, 5, 6)] == [
        CoverageLevel.none,
        CoverageLevel.low,
        CoverageLevel.low,
        CoverageLevel.medium,
        CoverageLevel.medium,
        CoverageLevel.high,
    ]


def test_invalid_thresholds_are_rejected():
    with pytest.raises(ValueError):
        CoverageThresholds(low_max=5, medium_max=5)


def test_square_polygon_is_closed_ccw_and_200m():
    ring = square_polygon(BORDEAUX_CELL)
    assert len(ring) == 5 and ring[0] == ring[-1]
    (sw_lon, sw_lat), (se_lon, _), _, (_, nw_lat), _ = ring
    assert se_lon > sw_lon and nw_lat > sw_lat
    assert 0.0015 < nw_lat - sw_lat < 0.0021
    lon, lat = square_centre(BORDEAUX_CELL)
    assert -0.60 < lon < -0.55 and 44.83 < lat < 44.86


def test_invalid_cell_id_is_rejected():
    with pytest.raises(ValueError):
        parse_cell_id("not-a-cell")


def test_parent_cell():
    assert parent_cell(BORDEAUX_CELL, 1000).id == "CRS3035RES1000mN2473000E3486000"


def test_areas():
    assert len(BORDEAUX_METROPOLE_COMMUNES) == 28
    assert in_area(["33063"], Area.bordeaux_metropole)
    assert not in_area(["33243"], Area.bordeaux_metropole)
    assert in_area(["33243"], Area.gironde)
    assert not in_area(["24322"], Area.gironde)


def test_missing_modes_are_counted():
    unknown = Counter()
    assert gtfs_modes([], unknown) == (StationType.other,)
    assert gbfs_modes([], is_citiz=False, unknown=unknown) == (StationType.other,)
    assert unknown == Counter({"gtfs stop without route_types": 1, "gbfs station without form_factors": 1})


def test_citiz_without_form_factors_is_not_missing():
    unknown = Counter()
    assert gbfs_modes([], is_citiz=True, unknown=unknown) == (StationType.citiz,)
    assert not unknown
