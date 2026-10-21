from functools import lru_cache

from app.config import DataMode, Settings, get_settings
from app.data.mock import mock_dataset
from app.data.models import Dataset
from app.data.prepared import load_prepared


@lru_cache
def load_dataset(settings: Settings) -> Dataset:
    if settings.data_mode is DataMode.real:
        return load_prepared(settings.data_dir, settings.coverage_thresholds)
    return mock_dataset(settings.coverage_thresholds)


def get_dataset() -> Dataset:
    return load_dataset(get_settings())
