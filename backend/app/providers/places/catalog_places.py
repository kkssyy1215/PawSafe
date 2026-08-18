from __future__ import annotations

import json
import re
from pathlib import Path

from app.core.errors import InvalidDataFileError
from app.schemas.location import CoordinateInput
from app.schemas.place import Place
from app.services.node_matching_service import haversine_m


class CatalogPlaceSearchProvider:
    """Search the fixed, graph-connected supported location catalog."""

    def __init__(self, path: Path) -> None:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            self._places = [Place.model_validate(item) for item in payload["items"]]
        except Exception as exc:
            raise InvalidDataFileError("supported_places") from exc

    async def search(
        self,
        query: str,
        *,
        origin: CoordinateInput | None = None,
    ) -> list[Place]:
        normalized = self._normalize(query)
        matches = [
            place
            for place in self._places
            if normalized in self._normalize(f"{place.name} {place.address}")
        ]
        if origin is not None:
            matches.sort(
                key=lambda place: haversine_m(origin.lat, origin.lng, place.lat, place.lng)
            )
        return matches[:10]

    async def reverse_geocode(self, lat: float, lng: float) -> Place:
        nearest = min(
            self._places,
            key=lambda place: haversine_m(lat, lng, place.lat, place.lng),
            default=None,
        )
        if nearest is not None and haversine_m(lat, lng, nearest.lat, nearest.lng) <= 50:
            return nearest.model_copy(
                update={"id": "current_location", "name": f"현재 위치 · {nearest.name}"}
            )
        return Place(
            id="current_location",
            name="현재 위치",
            address="현재 기기 위치",
            lat=lat,
            lng=lng,
            is_in_coverage=False,
        )

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"[\s.,()[\]{}'\"·-]+", "", value.casefold())
