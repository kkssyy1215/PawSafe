from __future__ import annotations

import json
from pathlib import Path

from app.core.errors import InvalidDataFileError, PlaceNotFoundError
from app.core.geo import haversine_m
from app.schemas.location import CoordinateInput
from app.schemas.place import Place


class MockPlaceSearchProvider:
    def __init__(self, path: Path) -> None:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            self._places = [Place.model_validate(item) for item in payload["items"]]
        except Exception as exc:
            raise InvalidDataFileError("mock_places") from exc

    async def search(
        self,
        query: str,
        *,
        origin: CoordinateInput | None = None,
    ) -> list[Place]:
        normalized = query.casefold().strip()
        matches = [
            place
            for place in self._places
            if normalized in f"{place.name} {place.address}".casefold()
        ]
        if origin is not None:
            matches.sort(
                key=lambda place: haversine_m(
                    origin.lat,
                    origin.lng,
                    place.lat,
                    place.lng,
                )
            )
        return matches[:10]

    async def reverse_geocode(self, lat: float, lng: float) -> Place:
        if not self._places:
            raise PlaceNotFoundError()
        return Place(
            id="current_location",
            name="현재 위치",
            address="서울특별시 마포구 데모 위치",
            lat=lat,
            lng=lng,
            is_in_coverage=False,
        )
