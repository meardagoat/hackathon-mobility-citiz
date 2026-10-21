from app.areas import Area
from app.data.models import Dataset
from app.geo import BBox
from app.schemas import Feature, PointGeometry, StationProperties, StationsResponse
from app.services.selection import build_collection_meta, select_stations
from app.station_types import StationType

MAX_STATIONS = 50000
DEFAULT_STATIONS_LIMIT = 20000


def get_stations(
    ds: Dataset,
    area: Area,
    bbox: BBox | None = None,
    types: list[StationType] | None = None,
    limit: int = DEFAULT_STATIONS_LIMIT,
) -> StationsResponse:
    stations = sorted(select_stations(ds, area, bbox, types), key=lambda s: s.station_id)
    returned = stations[:limit]
    return StationsResponse(
        meta=build_collection_meta(ds, area, total=len(stations), returned=len(returned)),
        features=[
            Feature(
                geometry=PointGeometry(coordinates=(s.lon, s.lat)),
                properties=StationProperties(
                    station_id=s.station_id,
                    name=s.name,
                    type=s.type,
                    modes=list(s.modes),
                    operator=s.operator,
                    source=s.source,
                    capacity=s.capacity,
                    population_served=s.population_served,
                ),
            )
            for s in returned
        ],
    )
