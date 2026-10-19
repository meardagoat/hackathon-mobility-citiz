from collections import defaultdict

from app.areas import Area
from app.coverage_levels import CoverageLevel, classify, is_underserved
from app.data.models import Dataset, Zone
from app.geo import BBox, cell_centre, parent_cell, square_centre, square_polygon
from app.schemas import (
    CoverageProperties,
    CoverageResponse,
    Feature,
    HeatmapMetric,
    HeatmapResolution,
    HeatmapResponse,
    PolygonGeometry,
    ValueRange,
)
from app.services.selection import build_collection_meta, select_zones, zone_population

MAX_COVERAGE_FEATURES = 5000


def _options_per_1000(zone: Zone) -> float | None:
    population = zone_population(zone)
    if zone.options_count is None or population == 0:
        return None
    return round(1000 * zone.options_count / population, 2)


def _feature(ds: Dataset, zone: Zone) -> Feature:
    return Feature(
        geometry=PolygonGeometry(coordinates=[list(square_polygon(zone.zone_id))]),
        properties=CoverageProperties(
            zone_id=zone.zone_id,
            population=zone_population(zone),
            is_estimated=zone.is_estimated,
            commune_codes=list(zone.commune_codes),
            options_count=zone.options_count,
            options_by_type=zone.options_by_type,
            options_per_1000_inhabitants=_options_per_1000(zone),
            accessibility_score=zone.accessibility_score,
            coverage_level=classify(zone.options_count, ds.coverage_thresholds),
        ),
    )


def get_coverage(
    ds: Dataset,
    area: Area,
    bbox: BBox | None = None,
    limit: int = MAX_COVERAGE_FEATURES,
    levels: list[CoverageLevel] | None = None,
) -> CoverageResponse:
    zones = select_zones(ds, area, bbox)
    if levels:
        zones = [z for z in zones if classify(z.options_count, ds.coverage_thresholds) in levels]
    zones.sort(key=lambda z: (-zone_population(z), z.zone_id))
    returned = zones[:limit]
    return CoverageResponse(
        meta=build_collection_meta(ds, area, total=len(zones), returned=len(returned)),
        features=[_feature(ds, z) for z in returned],
    )


def metric_available(ds: Dataset, zones: list[Zone], metric: HeatmapMetric) -> bool:
    if metric is HeatmapMetric.population:
        return True
    if not ds.accessibility_available:
        return False
    if metric is HeatmapMetric.accessibility_score:
        return all(z.accessibility_score is not None for z in zones)
    return True


def _aggregate(zones: list[Zone], metric: HeatmapMetric) -> float:
    if metric is HeatmapMetric.population:
        return sum(zone_population(z) for z in zones)
    if metric is HeatmapMetric.underserved_population:
        return sum(zone_population(z) for z in zones if is_underserved(z.options_count))
    weights = [zone_population(z) for z in zones]
    scores = [z.accessibility_score for z in zones]
    if sum(weights) == 0:
        return round(sum(scores) / len(scores), 4)
    return round(sum(w * s for w, s in zip(weights, scores)) / sum(weights), 4)


def _groups(zones: list[Zone], resolution: HeatmapResolution) -> dict[tuple[float, float], list[Zone]]:
    groups: dict[tuple[float, float], list[Zone]] = defaultdict(list)
    for zone in zones:
        if resolution is HeatmapResolution.km1:
            centre = cell_centre(parent_cell(zone.zone_id, 1000))
        else:
            centre = square_centre(zone.zone_id)
        groups[centre].append(zone)
    return groups


def get_heatmap(
    ds: Dataset,
    area: Area,
    bbox: BBox | None = None,
    metric: HeatmapMetric = HeatmapMetric.population,
    resolution: HeatmapResolution = HeatmapResolution.m200,
) -> HeatmapResponse:
    zones = select_zones(ds, area, bbox)
    available = metric_available(ds, zones, metric)
    points = []
    if available:
        points = [
            (lon, lat, float(_aggregate(group, metric)))
            for (lon, lat), group in sorted(_groups(zones, resolution).items())
        ]
    values = [p[2] for p in points]
    return HeatmapResponse(
        meta=build_collection_meta(ds, area, total=len(points), returned=len(points)),
        metric=metric,
        resolution=resolution,
        metric_available=available,
        value_range=ValueRange(min=min(values), max=max(values)) if values else None,
        points=points,
    )
