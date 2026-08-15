from __future__ import annotations

from app.providers.places.base import PlaceSearchProvider
from app.schemas.location import CoordinateInput
from app.schemas.place import Place
from app.services.coverage_service import CoverageService


class PlaceService:
    def __init__(self, provider: PlaceSearchProvider, coverage: CoverageService) -> None:
        self._provider = provider
        self._coverage = coverage

    async def search(
        self,
        query: str,
        *,
        origin: CoordinateInput | None = None,
    ) -> list[Place]:
        items = await self._provider.search(query, origin=origin)
        return [
            item.model_copy(update={"is_in_coverage": self._coverage.contains(item)})
            for item in items
        ]

    async def reverse_geocode(self, lat: float, lng: float) -> Place:
        item = await self._provider.reverse_geocode(lat, lng)
        return item.model_copy(update={"is_in_coverage": self._coverage.contains(item)})
