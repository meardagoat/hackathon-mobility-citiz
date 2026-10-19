from collections.abc import Iterable
from enum import Enum


class Area(str, Enum):
    bordeaux_metropole = "bordeaux_metropole"
    gironde = "gironde"


DEFAULT_AREA = Area.bordeaux_metropole

# Source: geo.api.gouv.fr, EPCI 243300316 (Bordeaux Métropole)
BORDEAUX_METROPOLE_COMMUNES = frozenset({
    "33003", "33004", "33013", "33032", "33039", "33056", "33063",
    "33065", "33069", "33075", "33096", "33119", "33162", "33167",
    "33192", "33200", "33249", "33273", "33281", "33312", "33318",
    "33376", "33434", "33449", "33487", "33519", "33522", "33550",
})

GIRONDE_DEPARTMENT = "33"


def commune_in_area(commune_code: str, area: Area) -> bool:
    if area is Area.gironde:
        return commune_code.startswith(GIRONDE_DEPARTMENT)
    return commune_code in BORDEAUX_METROPOLE_COMMUNES


def in_area(commune_codes: Iterable[str], area: Area) -> bool:
    return any(commune_in_area(code, area) for code in commune_codes)
