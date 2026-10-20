from collections import defaultdict
from dataclasses import replace

from app.data.models import EquipmentType, PrecomputedRecommendation, Station, Zone
from app.geo import GridCell, cells_within, parse_cell_id, to_projected
from app.station_types import StationType

GRID_EPSG = 3035
GRID_SIZE = 200
COVERAGE_TYPES = {
    EquipmentType.bus_stop: StationType.bus,
    EquipmentType.bike_station: StationType.bike,
    EquipmentType.citiz_station: StationType.citiz,
}


def cell_centre_xy(cell: GridCell) -> tuple[float, float]:
    half = cell.size / 2
    return cell.east + half, cell.north + half


def candidate_cell(location_id: str) -> GridCell:
    return parse_cell_id(location_id.split("_", 1)[-1])


class ZoneGrid:
    def __init__(self, zones: tuple[Zone, ...]):
        self._zones: dict[tuple[int, int], Zone] = {}
        for zone in zones:
            cell = parse_cell_id(zone.zone_id)
            self._zones[(cell.north, cell.east)] = zone

    def within(self, x: float, y: float, radius: float) -> list[Zone]:
        return [self._zones[c] for c in cells_within(x, y, radius, GRID_SIZE) if c in self._zones]


def _people(zone: Zone) -> int:
    return round(zone.population)


def visible_population(zones: list[Zone]) -> int:
    return sum(_people(z) for z in zones if not z.is_estimated)


def with_served_population(stations: tuple[Station, ...], grid: ZoneGrid, radius: float) -> tuple[Station, ...]:
    return tuple(
        replace(s, population_served=visible_population(grid.within(*to_projected(s.lon, s.lat, GRID_EPSG), radius)))
        for s in stations
    )


def with_visible_gains(
    recommendations: tuple[PrecomputedRecommendation, ...], grid: ZoneGrid, radius: float
) -> tuple[tuple[PrecomputedRecommendation, ...], list[str]]:
    """Replays notebook 05's coverage rules to replace pop_nouvelle with its unmasked part."""
    covered: dict[tuple, set[str]] = defaultdict(set)
    result, mismatches = [], []
    for r in sorted(recommendations, key=lambda r: (r.perimeter.value, r.budget, r.rank)):
        station_type = COVERAGE_TYPES[r.equipment_type]
        seen = covered[(r.perimeter, r.budget, r.equipment_type)]
        new = [
            z for z in grid.within(*cell_centre_xy(candidate_cell(r.location_id)), radius)
            if _people(z) > 0 and not (z.options_by_type or {}).get(station_type) and z.zone_id not in seen
        ]
        seen.update(z.zone_id for z in new)
        reproduced = sum(_people(z) for z in new)
        if reproduced != r.population_gained:
            mismatches.append(f"{r.perimeter.value}/{r.budget} rank {r.rank} {r.location_id}: "
                              f"published {r.population_gained}, reproduced {reproduced}")
        result.append(replace(r, population_gained=visible_population(new)))
    return tuple(result), mismatches
