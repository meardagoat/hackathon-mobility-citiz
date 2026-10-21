from collections.abc import Iterable

from app.areas import Area, commune_in_area, in_area
from app.data.models import Candidate, Dataset, Station, Zone
from app.geo import BBox, square_centre
from app.schemas import CollectionMeta, Meta
from app.station_types import StationType


def zone_population(zone: Zone) -> int | None:
    return None if zone.is_estimated else round(zone.population)


def total_population(zones: Iterable[Zone]) -> int:
    return sum(round(z.population) for z in zones if not z.is_estimated)


def masked_count(zones: Iterable[Zone]) -> int:
    return sum(1 for z in zones if z.is_estimated)


def share(part: int, total: int) -> float | None:
    return round(part / total, 4) if total > 0 else None


def select_zones(ds: Dataset, area: Area, bbox: BBox | None = None) -> list[Zone]:
    zones = [z for z in ds.zones if in_area(z.commune_codes, area)]
    if bbox is not None:
        zones = [z for z in zones if bbox.contains(*square_centre(z.zone_id))]
    return zones


def select_stations(
    ds: Dataset, area: Area, bbox: BBox | None = None, types: Iterable[StationType] | None = None
) -> list[Station]:
    wanted = set(types or ())
    return [
        s for s in ds.stations
        if commune_in_area(s.commune_code, area)
        and (bbox is None or bbox.contains(s.lon, s.lat))
        and (not wanted or wanted.intersection(s.modes))
    ]


def select_candidates(ds: Dataset, area: Area) -> list[Candidate]:
    return [c for c in ds.candidates if commune_in_area(c.commune_code, area)]


def build_meta(ds: Dataset, area: Area) -> Meta:
    return Meta(
        data_mode=ds.mode,
        area=area,
        data_collected_at=ds.collected_at,
        accessibility_available=ds.accessibility_available,
        recommendations_available=ds.recommendations_available,
    )


def build_collection_meta(ds: Dataset, area: Area, total: int, returned: int) -> CollectionMeta:
    return CollectionMeta(
        **build_meta(ds, area).model_dump(),
        total_features=total,
        returned_features=returned,
        truncated=returned < total,
    )
