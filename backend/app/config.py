import os
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from pathlib import Path

from app.coverage_levels import CoverageThresholds

DEFAULT_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "processed"


class DataMode(str, Enum):
    mock = "mock"
    real = "real"


@dataclass(frozen=True)
class Settings:
    data_mode: DataMode = DataMode.mock
    data_dir: Path = DEFAULT_DATA_DIR
    coverage_thresholds: CoverageThresholds | None = None


def _optional_int(name: str) -> int | None:
    value = os.getenv(name)
    return int(value) if value else None


def settings_from_env() -> Settings:
    low_max = _optional_int("COVERAGE_LOW_MAX")
    medium_max = _optional_int("COVERAGE_MEDIUM_MAX")
    thresholds = None
    if low_max is not None or medium_max is not None:
        if low_max is None or medium_max is None:
            raise ValueError("COVERAGE_LOW_MAX and COVERAGE_MEDIUM_MAX must be set together")
        thresholds = CoverageThresholds(low_max=low_max, medium_max=medium_max)
    return Settings(
        data_mode=DataMode(os.getenv("DATA_MODE", DataMode.mock.value)),
        data_dir=Path(os.getenv("DATA_DIR", str(DEFAULT_DATA_DIR))),
        coverage_thresholds=thresholds,
    )


@lru_cache
def get_settings() -> Settings:
    return settings_from_env()
