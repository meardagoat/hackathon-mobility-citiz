from fastapi import Depends, Query
from fastapi.exceptions import RequestValidationError

from app.areas import DEFAULT_AREA, Area
from app.data import get_dataset
from app.data.models import Dataset


def invalid(loc: tuple[str, ...], message: str, value: object) -> RequestValidationError:
    return RequestValidationError([{"type": "value_error", "loc": loc, "msg": message, "input": value}])


def ensure_area(ds: Dataset, area: Area, loc: tuple[str, ...]) -> None:
    if area not in ds.areas:
        supported = sorted(a.value for a in ds.areas)
        raise invalid(loc, f"area '{area.value}' is not covered by the {ds.mode.value} data; supported: {supported}",
                      area.value)


def supported_area(area: Area = Query(DEFAULT_AREA), dataset: Dataset = Depends(get_dataset)) -> Area:
    ensure_area(dataset, area, ("query", "area"))
    return area
