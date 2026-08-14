from __future__ import annotations

from typing import Protocol

from app.schemas.location import CoordinateInput
from app.schemas.place import Place


class PlaceSearchProvider(Protocol):
    async def search(
        self,
        query: str,
        *,
        origin: CoordinateInput | None = None,
    ) -> list[Place]: ...

    async def reverse_geocode(self, lat: float, lng: float) -> Place: ...
