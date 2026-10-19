from collections import Counter
from collections.abc import Iterable
from enum import Enum


class StationType(str, Enum):
    bus = "bus"
    tram = "tram"
    metro = "metro"
    train = "train"
    ferry = "ferry"
    bike = "bike"
    scooter = "scooter"
    carsharing = "carsharing"
    citiz = "citiz"
    other = "other"


class StationSource(str, Enum):
    gtfs = "gtfs"
    gbfs = "gbfs"
    mock = "mock"


PRIMARY_TYPE_PRIORITY = (
    StationType.citiz,
    StationType.carsharing,
    StationType.train,
    StationType.metro,
    StationType.tram,
    StationType.ferry,
    StationType.bus,
    StationType.bike,
    StationType.scooter,
    StationType.other,
)

_GTFS_ROUTE_TYPES: dict[int, StationType] = {
    0: StationType.tram,
    1: StationType.metro,
    2: StationType.train,
    3: StationType.bus,
    4: StationType.ferry,
    11: StationType.bus,
    800: StationType.bus,
    1000: StationType.ferry,
    1200: StationType.ferry,
    **{code: StationType.train for code in range(100, 118)},
    **{code: StationType.bus for code in range(200, 210)},
    **{code: StationType.metro for code in range(400, 405)},
    **{code: StationType.bus for code in range(700, 717)},
    **{code: StationType.tram for code in range(900, 907)},
}

_GBFS_FORM_FACTORS: dict[str, StationType] = {
    "bicycle": StationType.bike,
    "cargo_bicycle": StationType.bike,
    "scooter": StationType.scooter,
    "scooter_standing": StationType.scooter,
    "scooter_seating": StationType.scooter,
    "moped": StationType.scooter,
    "car": StationType.carsharing,
}


def gtfs_route_type(code: str | int, unknown: Counter | None = None) -> StationType:
    try:
        station_type = _GTFS_ROUTE_TYPES.get(int(code))
    except (TypeError, ValueError):
        station_type = None
    if station_type is None:
        if unknown is not None:
            unknown[f"gtfs route_type {code}"] += 1
        return StationType.other
    return station_type


def gbfs_form_factor(form_factor: str, is_citiz: bool, unknown: Counter | None = None) -> StationType:
    station_type = _GBFS_FORM_FACTORS.get(form_factor.strip().lower())
    if station_type is None:
        if unknown is not None:
            unknown[f"gbfs form_factor {form_factor}"] += 1
        return StationType.other
    if is_citiz and station_type is StationType.carsharing:
        return StationType.citiz
    return station_type


def sort_modes(modes: Iterable[StationType]) -> tuple[StationType, ...]:
    unique = set(modes) or {StationType.other}
    return tuple(t for t in PRIMARY_TYPE_PRIORITY if t in unique)


def gtfs_modes(route_types: Iterable[str | int], unknown: Counter | None = None) -> tuple[StationType, ...]:
    return sort_modes(gtfs_route_type(code, unknown) for code in route_types)


def gbfs_modes(form_factors: Iterable[str], is_citiz: bool, unknown: Counter | None = None) -> tuple[StationType, ...]:
    modes = {gbfs_form_factor(f, is_citiz, unknown) for f in form_factors}
    if is_citiz:
        modes = (modes - {StationType.other}) | {StationType.citiz}
    return sort_modes(modes)


def primary_type(modes: Iterable[StationType]) -> StationType:
    return sort_modes(modes)[0]


def station_id(source: StationSource, resource_id: str, native_id: str) -> str:
    if source is StationSource.mock:
        return f"mock:{native_id}"
    return f"{source.value}:{resource_id}:{native_id}"
