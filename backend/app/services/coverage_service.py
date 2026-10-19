from app.schemas import (
    BBox,
    CoverageProperties,
    CoverageResponse,
    Feature,
    PointGeometry,
    PolygonGeometry,
    StationProperties,
    StationsResponse,
    StationType,
)

_CELL_LAT = 0.0018
_CELL_LON = 0.0027
_GRID_ORIGIN = (7.735, 48.575)
_GRID_SIZE = 4

_MOCK_STATIONS = [
    ("cts-homme-de-fer", "Homme de Fer", StationType.tram, "CTS", 7.7455, 48.5833, 4200),
    ("cts-republique", "République", StationType.tram, "CTS", 7.7530, 48.5878, 3100),
    ("cts-bus-broglie", "Broglie", StationType.bus, "CTS", 7.7505, 48.5845, 2800),
    ("cts-bus-gare", "Gare Centrale", StationType.bus, "CTS", 7.7350, 48.5845, 3600),
    ("velhop-gare", "Vélhop Gare", StationType.bike, "Vélhop", 7.7365, 48.5838, 3400),
    ("velhop-kleber", "Vélhop Kléber", StationType.bike, "Vélhop", 7.7460, 48.5835, 4000),
    ("tier-krutenau", "Krutenau", StationType.scooter, "Tier", 7.7570, 48.5800, 2100),
    ("citiz-gare", "Citiz Gare", StationType.citiz, "Citiz Grand Est", 7.7340, 48.5850, 3300),
    ("citiz-esplanade", "Citiz Esplanade", StationType.citiz, "Citiz Grand Est", 7.7660, 48.5790, 2500),
]


def _cell_polygon(lon: float, lat: float) -> PolygonGeometry:
    ring = [
        (lon, lat),
        (lon + _CELL_LON, lat),
        (lon + _CELL_LON, lat + _CELL_LAT),
        (lon, lat + _CELL_LAT),
        (lon, lat),
    ]
    return PolygonGeometry(coordinates=[ring])


def get_coverage(bbox: BBox | None = None) -> CoverageResponse:
    features = []
    for i in range(_GRID_SIZE):
        for j in range(_GRID_SIZE):
            lon = _GRID_ORIGIN[0] + i * _CELL_LON
            lat = _GRID_ORIGIN[1] + j * _CELL_LAT
            center_lon, center_lat = lon + _CELL_LON / 2, lat + _CELL_LAT / 2
            if bbox and not bbox.contains(center_lon, center_lat):
                continue

            centrality = _GRID_SIZE - abs(i - 1.5) - abs(j - 1.5)
            population = int(150 + 120 * centrality)
            by_type = {
                StationType.bus: int(centrality),
                StationType.tram: int(centrality // 2),
                StationType.bike: (i + j) % 3,
                StationType.scooter: (i * j) % 2,
                StationType.citiz: 1 if centrality > 2.5 else 0,
            }
            options = sum(by_type.values())
            features.append(
                Feature(
                    geometry=_cell_polygon(lon, lat),
                    properties=CoverageProperties(
                        zone_id=f"CRS3035RES200mN{2_890_000 + j * 200}E{4_200_000 + i * 200}",
                        population=population,
                        options_count=options,
                        options_by_type=by_type,
                        options_per_1000_inhabitants=round(1000 * options / population, 2),
                        accessibility_score=round(min(options / 10, 1.0), 2),
                    ),
                )
            )
    return CoverageResponse(features=features)


def get_stations(
    types: list[StationType] | None = None, bbox: BBox | None = None
) -> StationsResponse:
    features = [
        Feature(
            geometry=PointGeometry(coordinates=(lon, lat)),
            properties=StationProperties(
                station_id=station_id,
                name=name,
                type=station_type,
                operator=operator,
                population_served=population_served,
            ),
        )
        for station_id, name, station_type, operator, lon, lat, population_served in _MOCK_STATIONS
        if (not types or station_type in types) and (not bbox or bbox.contains(lon, lat))
    ]
    return StationsResponse(features=features)
