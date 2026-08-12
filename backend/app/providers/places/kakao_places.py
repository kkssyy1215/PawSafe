from __future__ import annotations

from typing import Any

import httpx

from app.core.errors import (
    ExternalApiError,
    ExternalApiTimeoutError,
    InvalidResponseError,
    NetworkError,
    PlaceNotFoundError,
)
from app.schemas.place import Place

KAKAO_BASE_URL = "https://dapi.kakao.com"


class KakaoPlaceSearchProvider:
    def __init__(
        self,
        client: httpx.AsyncClient,
        api_key: str,
        *,
        timeout_seconds: float,
    ) -> None:
        self._client = client
        self._headers = {"Authorization": f"KakaoAK {api_key}"}
        self._timeout = timeout_seconds

    async def search(self, query: str) -> list[Place]:
        payload = await self._get(
            "/v2/local/search/keyword.json",
            params={"query": query, "size": "10"},
        )
        try:
            return [
                Place(
                    id=str(item["id"]),
                    name=str(item["place_name"]),
                    address=str(
                        item.get("road_address_name") or item.get("address_name") or "주소 없음"
                    ),
                    lat=float(item["y"]),
                    lng=float(item["x"]),
                    is_in_coverage=False,
                )
                for item in payload.get("documents", [])
            ]
        except (KeyError, TypeError, ValueError) as exc:
            raise InvalidResponseError() from exc

    async def reverse_geocode(self, lat: float, lng: float) -> Place:
        payload = await self._get(
            "/v2/local/geo/coord2address.json",
            params={"x": str(lng), "y": str(lat)},
        )
        documents = payload.get("documents", [])
        if not isinstance(documents, list):
            raise InvalidResponseError()
        if not documents:
            raise PlaceNotFoundError()
        try:
            item = documents[0]
            road = item.get("road_address") or {}
            parcel = item.get("address") or {}
            address = road.get("address_name") or parcel.get("address_name")
        except (AttributeError, TypeError) as exc:
            raise InvalidResponseError() from exc
        if not address:
            raise PlaceNotFoundError()
        return Place(
            id="current_location",
            name="현재 위치",
            address=str(address),
            lat=lat,
            lng=lng,
            is_in_coverage=False,
        )

    async def _get(self, endpoint: str, *, params: dict[str, str]) -> dict[str, Any]:
        try:
            response = await self._client.get(
                f"{KAKAO_BASE_URL}{endpoint}",
                headers=self._headers,
                params=params,
                timeout=self._timeout,
            )
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("invalid Kakao response")
            return payload
        except httpx.TimeoutException as exc:
            raise ExternalApiTimeoutError() from exc
        except httpx.ConnectError as exc:
            raise NetworkError() from exc
        except httpx.HTTPError as exc:
            raise ExternalApiError() from exc
        except ValueError as exc:
            raise InvalidResponseError() from exc
