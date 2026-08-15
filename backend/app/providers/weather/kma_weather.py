from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from urllib.parse import unquote
from zoneinfo import ZoneInfo

import httpx

from app.core.errors import (
    ExternalApiError,
    ExternalApiTimeoutError,
    InvalidResponseError,
    NetworkError,
)
from app.schemas.weather import CurrentWeatherResponse

SEOUL = ZoneInfo("Asia/Seoul")


class KmaWeatherProvider:
    def __init__(
        self,
        client: httpx.AsyncClient,
        service_key: str,
        *,
        base_url: str,
        grid_x: int,
        grid_y: int,
        timeout_seconds: float,
    ) -> None:
        self._client = client
        # 공공데이터포털의 Encoding 키와 Decoding 키를 모두 받을 수 있게 정규화한다.
        self._service_key = unquote(service_key)
        self._base_url = base_url.rstrip("/")
        self._grid_x = grid_x
        self._grid_y = grid_y
        self._timeout = timeout_seconds

    async def current(self, now: datetime | None = None) -> CurrentWeatherResponse:
        base_at = self._latest_available_base_time(now)
        payload = await self._get(
            "/getUltraSrtNcst",
            params={
                "ServiceKey": self._service_key,
                "pageNo": "1",
                "numOfRows": "100",
                "dataType": "JSON",
                "base_date": base_at.strftime("%Y%m%d"),
                "base_time": base_at.strftime("%H00"),
                "nx": str(self._grid_x),
                "ny": str(self._grid_y),
            },
        )
        return self._parse(payload)

    @staticmethod
    def _latest_available_base_time(now: datetime | None) -> datetime:
        current = now.astimezone(SEOUL) if now else datetime.now(SEOUL)
        # 초단기실황은 매시 40분 이후 제공되므로, 그 전에는 전 시간 자료를 요청한다.
        if current.minute < 40:
            current -= timedelta(hours=1)
        return current.replace(minute=0, second=0, microsecond=0)

    async def _get(self, endpoint: str, *, params: dict[str, str]) -> dict[str, Any]:
        try:
            response = await self._client.get(
                f"{self._base_url}{endpoint}",
                params=params,
                timeout=self._timeout,
            )
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("invalid KMA response")
            return payload
        except httpx.TimeoutException as exc:
            raise ExternalApiTimeoutError() from exc
        except httpx.ConnectError as exc:
            raise NetworkError() from exc
        except httpx.HTTPError as exc:
            raise ExternalApiError() from exc
        except ValueError as exc:
            raise InvalidResponseError() from exc

    def _parse(self, payload: dict[str, Any]) -> CurrentWeatherResponse:
        try:
            response = payload["response"]
            header = response["header"]
            if str(header["resultCode"]) != "00":
                raise InvalidResponseError()
            items = response["body"]["items"]["item"]
            if not isinstance(items, list):
                raise TypeError("items must be a list")
            values = {str(item["category"]): float(item["obsrValue"]) for item in items}
            first = items[0]
            observed_at = datetime.strptime(
                f"{first['baseDate']}{first['baseTime']}",
                "%Y%m%d%H%M",
            ).replace(tzinfo=SEOUL)
            return CurrentWeatherResponse(
                observed_at=observed_at,
                temperature_c=values.get("T1H"),
                humidity_pct=values.get("REH"),
                wind_speed_ms=values.get("WSD"),
                rainfall_mm=values.get("RN1"),
                grid_x=self._grid_x,
                grid_y=self._grid_y,
            )
        except InvalidResponseError:
            raise
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise InvalidResponseError() from exc
