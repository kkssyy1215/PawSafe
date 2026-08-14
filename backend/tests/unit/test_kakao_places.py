from __future__ import annotations

import httpx
import pytest

from app.providers.places.kakao_places import KakaoPlaceSearchProvider
from app.schemas.location import CoordinateInput


def _response(request: httpx.Request) -> httpx.Response:
    return httpx.Response(
        200,
        request=request,
        json={
            "documents": [
                {
                    "id": "park_1",
                    "place_name": "망원한강공원",
                    "road_address_name": "서울특별시 마포구 마포나루길",
                    "address_name": "서울특별시 마포구 망원동",
                    "x": "126.9000",
                    "y": "37.5550",
                }
            ]
        },
    )


@pytest.mark.asyncio
async def test_kakao_search_q_only_has_no_location_parameters() -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return _response(request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = KakaoPlaceSearchProvider(client, "server-only-key", timeout_seconds=5)
        places = await provider.search("망원")

    assert places[0].id == "park_1"
    params = captured[0].url.params
    assert params["query"] == "망원"
    assert params["size"] == "10"
    assert all(key not in params for key in ("x", "y", "radius", "sort"))


@pytest.mark.asyncio
async def test_kakao_search_adds_proximity_parameters_for_origin_hint() -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return _response(request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = KakaoPlaceSearchProvider(client, "server-only-key", timeout_seconds=5)
        await provider.search(
            "산책로",
            origin=CoordinateInput(lat=37.55, lng=126.91),
        )

    params = captured[0].url.params
    assert params["query"] == "산책로"
    assert params["x"] == "126.91"
    assert params["y"] == "37.55"
    assert params["radius"] == "5000"
    assert params["sort"] == "distance"
