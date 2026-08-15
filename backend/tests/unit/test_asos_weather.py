from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
import pytest

from app.providers.weather.asos_weather import AsosWeatherProvider


@pytest.mark.asyncio
async def test_asos_maps_hourly_weather_and_solar_radiation() -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(
            200,
            request=request,
            json={
                "response": {
                    "header": {"resultCode": "00", "resultMsg": "NORMAL_SERVICE"},
                    "body": {
                        "items": {
                            "item": [
                                {
                                    "tm": "2026-08-14 14:00",
                                    "stnId": "108",
                                    "stnNm": "서울",
                                    "ta": "31.5",
                                    "hm": "62",
                                    "ws": "1.8",
                                    "rn": "",
                                    "icsr": "2.41",
                                    "ss": "1.0",
                                }
                            ]
                        }
                    },
                }
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = AsosWeatherProvider(
            client,
            "encoded%2Bkey%3D",
            base_url="https://apis.data.go.kr/test",
            station_id=108,
            timeout_seconds=5,
        )
        result = await provider.same_hour_previous_day(
            datetime(2026, 8, 15, 14, 30, tzinfo=ZoneInfo("Asia/Seoul"))
        )

    assert result.observed_at.isoformat() == "2026-08-14T14:00:00+09:00"
    assert result.solar_radiation_mj_m2 == 2.41
    assert result.rainfall_mm is None
    params = captured[0].url.params
    assert params["startDt"] == "20260814"
    assert params["startHh"] == "14"
    assert params["stnIds"] == "108"
