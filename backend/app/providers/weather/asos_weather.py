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
from app.schemas.weather import AsosHourlyResponse

SEOUL = ZoneInfo("Asia/Seoul")


class AsosWeatherProvider:
    def __init__(
        self,
        client: httpx.AsyncClient,
        service_key: str,
        *,
        base_url: str,
        station_id: int,
        timeout_seconds: float,
    ) -> None:
        self._client = client
        self._service_key = unquote(service_key)
        self._base_url = base_url.rstrip("/")
        self._station_id = station_id
        self._timeout = timeout_seconds

    async def same_hour_previous_day(
        self,
        now: datetime | None = None,
    ) -> AsosHourlyResponse:
        current = now.astimezone(SEOUL) if now else datetime.now(SEOUL)
        reference = current - timedelta(days=1)
        payload = await self._get(
            "/getWthrDataList",
            params={
                "ServiceKey": self._service_key,
                "pageNo": "1",
                "numOfRows": "10",
                "dataType": "JSON",
                "dataCd": "ASOS",
                "dateCd": "HR",
                "startDt": reference.strftime("%Y%m%d"),
                "startHh": reference.strftime("%H"),
                "endDt": reference.strftime("%Y%m%d"),
                "endHh": reference.strftime("%H"),
                "stnIds": str(self._station_id),
            },
        )
        return self._parse(payload)

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
                raise ValueError("invalid ASOS response")
            return payload
        except httpx.TimeoutException as exc:
            raise ExternalApiTimeoutError() from exc
        except httpx.ConnectError as exc:
            raise NetworkError() from exc
        except httpx.HTTPError as exc:
            raise ExternalApiError() from exc
        except ValueError as exc:
            raise InvalidResponseError() from exc

    @staticmethod
    def _number(value: Any) -> float | None:
        if value in {None, ""}:
            return None
        return float(value)

    def _parse(self, payload: dict[str, Any]) -> AsosHourlyResponse:
        try:
            response = payload["response"]
            if str(response["header"]["resultCode"]) != "00":
                raise InvalidResponseError()
            items = response["body"]["items"]["item"]
            if isinstance(items, dict):
                items = [items]
            if not isinstance(items, list) or not items:
                raise InvalidResponseError()
            item = items[-1]
            observed_at = datetime.strptime(str(item["tm"]), "%Y-%m-%d %H:%M").replace(tzinfo=SEOUL)
            return AsosHourlyResponse(
                observed_at=observed_at,
                station_id=int(item["stnId"]),
                station_name=item.get("stnNm") or None,
                temperature_c=self._number(item.get("ta")),
                humidity_pct=self._number(item.get("hm")),
                wind_speed_ms=self._number(item.get("ws")),
                rainfall_mm=self._number(item.get("rn")),
                solar_radiation_mj_m2=self._number(item.get("icsr")),
                sunshine_hours=self._number(item.get("ss")),
            )
        except InvalidResponseError:
            raise
        except (KeyError, TypeError, ValueError) as exc:
            raise InvalidResponseError() from exc
