from __future__ import annotations

from typing import Protocol

from app.schemas.place import Place


class PlaceSearchProvider(Protocol):
    async def search(self, query: str) -> list[Place]: ...

    async def reverse_geocode(self, lat: float, lng: float) -> Place: ...
