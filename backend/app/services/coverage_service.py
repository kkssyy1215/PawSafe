from __future__ import annotations

from typing import Protocol

from app.core.errors import OutOfCoverageError
from app.repositories.coverage_repository import CoverageData, CoverageRepository


class HasCoordinate(Protocol):
    lat: float
    lng: float


class CoverageService:
    def __init__(self, data: CoverageData) -> None:
        self.data = data

    def contains(self, location: HasCoordinate) -> bool:
        return CoverageRepository.contains(self.data, lat=location.lat, lng=location.lng)

    def require_contains(self, *locations: HasCoordinate) -> None:
        if not all(self.contains(location) for location in locations):
            raise OutOfCoverageError()
