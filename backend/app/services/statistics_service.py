from collections import Counter

from app.areas import Area
from app.coverage_levels import CoverageLevel, classify
from app.data.models import Dataset, Zone
from app.geo import BBox
from app.schemas import (
    CitizSummary,
    CoverageThresholdsOut,
    PopulationGroup,
    PopulationGroupBy,
    PopulationStatsResponse,
    SummaryMeta,
    SummaryResponse,
)
from app.services.selection import (
    build_meta,
    masked_count,
    select_stations,
    select_zones,
    share,
    total_population,
    zone_population,
)
from app.station_types import StationType


def coverage_levels_available(ds: Dataset) -> bool:
    return ds.accessibility_available and ds.coverage_thresholds is not None


def station_types_available(ds: Dataset) -> bool:
    return ds.accessibility_available and all(z.options_by_type is not None for z in ds.zones)


def population_by_level(ds: Dataset, zones: list[Zone]) -> dict[CoverageLevel, int] | None:
    if not coverage_levels_available(ds):
        return None
    result = {level: 0 for level in CoverageLevel}
    for zone in zones:
        result[classify(zone.options_count, ds.coverage_thresholds)] += zone_population(zone) or 0
    return result


def population_with_type(zones: list[Zone], station_type: StationType) -> int | None:
    if any(z.options_by_type is None or station_type not in z.options_by_type for z in zones):
        return None
    return total_population(z for z in zones if z.options_by_type[station_type] > 0)


def population_with_any_option(ds: Dataset, zones: list[Zone]) -> int | None:
    if not ds.accessibility_available:
        return None
    return total_population(z for z in zones if z.options_count > 0)


def get_summary(ds: Dataset, area: Area, bbox: BBox | None = None) -> SummaryResponse:
    zones = select_zones(ds, area, bbox)
    stations = select_stations(ds, area, bbox)
    population = total_population(zones)
    counts = Counter(s.type for s in stations)
    citiz_count = counts[StationType.citiz]
    citiz_population = population_with_type(zones, StationType.citiz) if station_types_available(ds) else None
    any_option = population_with_any_option(ds, zones)
    thresholds = ds.coverage_thresholds

    return SummaryResponse(
        meta=SummaryMeta(
            **build_meta(ds, area).model_dump(),
            coverage_thresholds=(
                CoverageThresholdsOut(low_max=thresholds.low_max, medium_max=thresholds.medium_max)
                if thresholds else None
            ),
        ),
        population_total=population,
        zones_count=len(zones),
        masked_zones_count=masked_count(zones),
        stations_count=len(stations),
        stations_by_type={t: counts[t] for t in StationType},
        citiz=CitizSummary(
            stations_count=citiz_count,
            stations_per_100k_inhabitants=round(100_000 * citiz_count / population, 2) if population else None,
            population_within_5min=citiz_population,
            population_within_5min_share=share(citiz_population, population) if citiz_population is not None else None,
        ),
        population_by_coverage_level=population_by_level(ds, zones),
        population_with_any_option=any_option,
        population_with_any_option_share=share(any_option, population) if any_option is not None else None,
    )


def _group(key: str, zones: list[Zone], total: int) -> PopulationGroup:
    population = total_population(zones)
    return PopulationGroup(key=key, population=population, share=share(population, total), zones_count=len(zones),
                           masked_zones_count=masked_count(zones))


def _by_commune(zones: list[Zone], total: int) -> list[PopulationGroup]:
    groups: dict[str, list[Zone]] = {}
    for zone in zones:
        groups.setdefault(zone.commune_codes[0], []).append(zone)
    return [_group(code, groups[code], total) for code in sorted(groups)]


def _by_coverage_level(ds: Dataset, zones: list[Zone], total: int) -> list[PopulationGroup]:
    return [
        _group(level.value, [z for z in zones if classify(z.options_count, ds.coverage_thresholds) is level], total)
        for level in CoverageLevel
    ]


def _by_station_type(zones: list[Zone], total: int) -> list[PopulationGroup]:
    present = [t for t in StationType if all(z.options_by_type and t in z.options_by_type for z in zones)]
    return [_group(t.value, [z for z in zones if z.options_by_type[t] > 0], total) for t in present]


def get_population_stats(
    ds: Dataset, area: Area, bbox: BBox | None = None, group_by: PopulationGroupBy = PopulationGroupBy.coverage_level
) -> PopulationStatsResponse:
    zones = select_zones(ds, area, bbox)
    total = total_population(zones)

    if group_by is PopulationGroupBy.commune:
        available, groups = True, _by_commune(zones, total)
    elif group_by is PopulationGroupBy.coverage_level:
        available = coverage_levels_available(ds)
        groups = _by_coverage_level(ds, zones, total) if available else []
    else:
        available = station_types_available(ds)
        groups = _by_station_type(zones, total) if available else []

    return PopulationStatsResponse(
        meta=build_meta(ds, area),
        group_by=group_by,
        available=available,
        additive=group_by is not PopulationGroupBy.station_type,
        population_total=total,
        masked_zones_count=masked_count(zones),
        groups=groups,
    )
