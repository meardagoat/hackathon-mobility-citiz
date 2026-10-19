from dataclasses import dataclass
from enum import Enum


class CoverageLevel(str, Enum):
    none = "none"
    low = "low"
    medium = "medium"
    high = "high"


@dataclass(frozen=True)
class CoverageThresholds:
    low_max: int
    medium_max: int

    def __post_init__(self) -> None:
        if not 1 <= self.low_max < self.medium_max:
            raise ValueError("coverage thresholds must satisfy 1 <= low_max < medium_max")


def is_underserved(options_count: int | None) -> bool | None:
    return None if options_count is None else options_count == 0


def classify(options_count: int | None, thresholds: CoverageThresholds | None) -> CoverageLevel | None:
    if options_count is None or thresholds is None:
        return None
    if is_underserved(options_count):
        return CoverageLevel.none
    if options_count <= thresholds.low_max:
        return CoverageLevel.low
    if options_count <= thresholds.medium_max:
        return CoverageLevel.medium
    return CoverageLevel.high
