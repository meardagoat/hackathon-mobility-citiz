from collections.abc import Iterable
from functools import lru_cache

from app.areas import Area, in_area
from app.data.models import Candidate, Dataset, Station, Zone
from app.geo import BBox, square_centre, square_polygon
from app.schemas import CollectionMeta, Meta
from app.station_types import StationType


def zone_population(zone: Zone) -> int:
    return round(zone.population)


def total_population(zones: Iterable[Zone]) -> int:
    return sum(zone_population(z) for z in zones)


def share(part: int, total: int) -> float | None:
    return round(part / total, 4) if total > 0 else None


def select_zones(ds: Dataset, area: Area, bbox: BBox | None = None) -> list[Zone]:
    zones = [z for z in ds.zones if in_area(z.commune_codes, area)]
    if bbox is not None:
        zones = [z for z in zones if bbox.contains(*square_centre(z.zone_id))]
    return zones


@lru_cache(maxsize=32)
def area_extent(ds: Dataset, area: Area) -> BBox | None:
    corners = [p for z in select_zones(ds, area) for p in square_polygon(z.zone_id)]
    if not corners:
        return None
    lons, lats = zip(*corners)
    return BBox(min(lons), min(lats), max(lons), max(lats))


def _extent(ds: Dataset, area: Area, bbox: BBox | None) -> BBox | None:
    extent = area_extent(ds, area)
    if extent is None or bbox is None:
        return extent
    return extent.intersection(bbox)


def select_stations(
    ds: Dataset, area: Area, bbox: BBox | None = None, types: Iterable[StationType] | None = None
) -> list[Station]:
    extent = _extent(ds, area, bbox)
    if extent is None:
        return []
    wanted = set(types or ())
    return [
        s for s in ds.stations
        if extent.contains(s.lon, s.lat) and (not wanted or wanted.intersection(s.modes))
    ]


def select_candidates(ds: Dataset, area: Area) -> list[Candidate]:
    extent = area_extent(ds, area)
    if extent is None:
        return []
    return [c for c in ds.candidates if extent.contains(c.lon, c.lat)]


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
