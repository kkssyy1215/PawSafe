from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
import pytest

from app.providers.weather.kma_weather import KmaWeatherProvider


def _kma_response(request: httpx.Request) -> httpx.Response:
    categories = {
        "T1H": 31.2,
        "RN1": 0.0,
        "REH": 68.0,
        "WSD": 1.7,
    }
    items = [
        {
            "baseDate": "20260815",
            "baseTime": "1400",
            "category": category,
            "obsrValue": value,
            "nx": 62,
            "ny": 126,
        }
        for category, value in categories.items()
    ]
    return httpx.Response(
        200,
        request=request,
        json={
            "response": {
                "header": {"resultCode": "00", "resultMsg": "NORMAL_SERVICE"},
                "body": {"items": {"item": items}},
            }
        },
    )


@pytest.mark.asyncio
async def test_kma_current_weather_maps_observation_categories() -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return _kma_response(request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = KmaWeatherProvider(
            client,
            "encoded%2Bkey%3D",
            base_url="https://apis.data.go.kr/test",
            grid_x=62,
            grid_y=126,
            timeout_seconds=5,
        )
        weather = await provider.current(
            datetime(2026, 8, 15, 14, 50, tzinfo=ZoneInfo("Asia/Seoul"))
        )

    assert weather.temperature_c == 31.2
    assert weather.humidity_pct == 68.0
    assert weather.wind_speed_ms == 1.7
    assert weather.rainfall_mm == 0.0
    assert weather.grid_x == 62
    assert weather.grid_y == 126
    params = captured[0].url.params
    assert params["ServiceKey"] == "encoded+key="
    assert params["base_date"] == "20260815"
    assert params["base_time"] == "1400"


def test_kma_uses_previous_hour_before_release_minute() -> None:
    base_at = KmaWeatherProvider._latest_available_base_time(
        datetime(2026, 8, 15, 0, 20, tzinfo=ZoneInfo("Asia/Seoul"))
    )

    assert base_at.strftime("%Y%m%d%H%M") == "202608142300"
