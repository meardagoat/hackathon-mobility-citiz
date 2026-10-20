import math
import re
from collections.abc import Iterator
from dataclasses import dataclass
from functools import lru_cache

from pyproj import Transformer

Position = tuple[float, float]

_IDCAR_PATTERN = re.compile(r"^CRS(\d+)RES(\d+)mN(\d+)E(\d+)$")
_PRECISION = 6


@dataclass(frozen=True)
class GridCell:
    epsg: int
    size: int
    north: int
    east: int

    @property
    def id(self) -> str:
        return f"CRS{self.epsg}RES{self.size}mN{self.north}E{self.east}"


@dataclass(frozen=True)
class BBox:
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

    def contains(self, lon: float, lat: float) -> bool:
        return self.min_lon <= lon <= self.max_lon and self.min_lat <= lat <= self.max_lat

    def intersection(self, other: "BBox") -> "BBox | None":
        result = BBox(
            max(self.min_lon, other.min_lon),
            max(self.min_lat, other.min_lat),
            min(self.max_lon, other.max_lon),
            min(self.max_lat, other.max_lat),
        )
        if result.min_lon > result.max_lon or result.min_lat > result.max_lat:
            return None
        return result


def parse_cell_id(cell_id: str) -> GridCell:
    match = _IDCAR_PATTERN.match(cell_id)
    if not match:
        raise ValueError(f"invalid INSEE grid cell id: {cell_id!r}")
    epsg, size, north, east = (int(v) for v in match.groups())
    return GridCell(epsg=epsg, size=size, north=north, east=east)


def parent_cell(cell_id: str, size: int) -> GridCell:
    cell = parse_cell_id(cell_id)
    return GridCell(epsg=cell.epsg, size=size, north=cell.north // size * size, east=cell.east // size * size)


@lru_cache
def _to_wgs84(epsg: int) -> Transformer:
    return Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)


@lru_cache
def _from_wgs84(epsg: int) -> Transformer:
    return Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True)


def to_projected(lon: float, lat: float, epsg: int) -> tuple[float, float]:
    return _from_wgs84(epsg).transform(lon, lat)


def cells_within(x: float, y: float, radius: float, size: int) -> Iterator[tuple[int, int]]:
    half = size / 2
    first_east = math.floor((x - radius - half) / size) * size
    first_north = math.floor((y - radius - half) / size) * size
    for east in range(first_east, math.floor(x + radius - half) + 1, size):
        for north in range(first_north, math.floor(y + radius - half) + 1, size):
            if (east + half - x) ** 2 + (north + half - y) ** 2 <= radius ** 2:
                yield north, east


def _project(epsg: int, east: float, north: float) -> Position:
    lon, lat = _to_wgs84(epsg).transform(east, north)
    return round(lon, _PRECISION), round(lat, _PRECISION)


def cell_polygon(cell: GridCell) -> list[Position]:
    e, n, s = cell.east, cell.north, cell.size
    corners = [(e, n), (e + s, n), (e + s, n + s), (e, n + s), (e, n)]
    return [_project(cell.epsg, x, y) for x, y in corners]


def cell_centre(cell: GridCell) -> Position:
    half = cell.size / 2
    return _project(cell.epsg, cell.east + half, cell.north + half)


@lru_cache(maxsize=None)
def square_polygon(cell_id: str) -> tuple[Position, ...]:
    return tuple(cell_polygon(parse_cell_id(cell_id)))


@lru_cache(maxsize=None)
def square_centre(cell_id: str) -> Position:
    return cell_centre(parse_cell_id(cell_id))
