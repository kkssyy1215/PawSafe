from __future__ import annotations

import httpx

from app.core.config import Settings
from app.core.errors import PipelineNotReadyError
from app.providers.places.base import PlaceSearchProvider
from app.providers.places.kakao_places import KakaoPlaceSearchProvider
from app.providers.places.mock_places import MockPlaceSearchProvider
from app.schemas.place import Place


class UnavailablePlaceSearchProvider:
    def __init__(self, component: str) -> None:
        self._component = component

    async def search(self, query: str) -> list[Place]:
        del query
        raise PipelineNotReadyError(self._component)

    async def reverse_geocode(self, lat: float, lng: float) -> Place:
        del lat, lng
        raise PipelineNotReadyError(self._component)


def create_place_provider(
    settings: Settings,
    client: httpx.AsyncClient,
) -> PlaceSearchProvider:
    if settings.place_provider == "mock":
        return MockPlaceSearchProvider(settings.resolve_path(settings.mock_places_file_path))
    if not settings.kakao_rest_api_key:
        return UnavailablePlaceSearchProvider("kakao_rest_api_key")
    return KakaoPlaceSearchProvider(
        client,
        settings.kakao_rest_api_key,
        timeout_seconds=settings.place_search_timeout_seconds,
    )
