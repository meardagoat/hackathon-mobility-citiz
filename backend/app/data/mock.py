from app.config import DataMode
from app.coverage_levels import CoverageThresholds
from app.data.models import Dataset, Station, Zone
from app.station_types import StationSource, StationType, primary_type, station_id

BORDEAUX = "33063"
MERIGNAC = "33281"
LIBOURNE = "33243"


def _zone(north: int, east: int, population: float, commune: str, is_estimated: bool = False) -> Zone:
    return Zone(
        zone_id=f"CRS3035RES200mN{north}E{east}",
        population=population,
        is_estimated=is_estimated,
        commune_codes=(commune,),
    )


def _station(slug: str, name: str, modes: tuple[StationType, ...], operator: str, lon: float, lat: float,
             capacity: int | None = None) -> Station:
    return Station(
        station_id=station_id(StationSource.mock, "", slug),
        name=name,
        modes=modes,
        type=primary_type(modes),
        operator=operator,
        source=StationSource.mock,
        lon=lon,
        lat=lat,
        capacity=capacity,
    )


MOCK_ZONES = (
    _zone(2473800, 3486600, 412, BORDEAUX),
    _zone(2473800, 3486800, 388, BORDEAUX),
    _zone(2473800, 3487000, 295, BORDEAUX),
    _zone(2474000, 3486600, 356, BORDEAUX),
    _zone(2474000, 3486800, 501, BORDEAUX),
    _zone(2474000, 3487000, 274, BORDEAUX),
    _zone(2473600, 3486600, 330, BORDEAUX),
    _zone(2473600, 3486800, 467, BORDEAUX),
    _zone(2473600, 3486000, 438, BORDEAUX),
    _zone(2473200, 3486000, 352, BORDEAUX),
    _zone(2471600, 3487800, 316, BORDEAUX),
    _zone(2474800, 3486800, 529, BORDEAUX),
    _zone(2474000, 3481000, 219, MERIGNAC),
    _zone(2474000, 3481200, 184, MERIGNAC),
    _zone(2474200, 3481000, 12, MERIGNAC, is_estimated=True),
    _zone(2478000, 3514000, 241, LIBOURNE),
)

MOCK_STATIONS = (
    _station("quinconces", "Quinconces", (StationType.tram, StationType.bus), "TBM", -0.5745, 44.8445),
    _station("gare-saint-jean", "Gare Saint-Jean", (StationType.train, StationType.tram, StationType.bus),
             "SNCF / TBM", -0.5560, 44.8257),
    _station("hotel-de-ville", "Hôtel de Ville", (StationType.tram,), "TBM", -0.5797, 44.8378),
    _station("batcub-quinconces", "Quinconces (BatCub)", (StationType.ferry,), "TBM", -0.5712, 44.8455),
    _station("v3-place-gambetta", "V³ Place Gambetta", (StationType.bike,), "TBM", -0.5807, 44.8411,
             capacity=20),
    _station("citiz-chartrons", "Citiz Chartrons", (StationType.citiz,), "Citiz", -0.5720, 44.8540, capacity=3),
    _station("merignac-centre", "Mérignac Centre", (StationType.tram, StationType.bus), "TBM", -0.6436, 44.8386),
    _station("libourne-gare", "Gare de Libourne", (StationType.train,), "SNCF", -0.2369, 44.9152),
)


def mock_dataset(coverage_thresholds: CoverageThresholds | None = None) -> Dataset:
    return Dataset(
        mode=DataMode.mock,
        zones=MOCK_ZONES,
        stations=MOCK_STATIONS,
        coverage_thresholds=coverage_thresholds,
    )
