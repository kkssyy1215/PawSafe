from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Literal
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode
from urllib.request import urlopen
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

SEOUL = ZoneInfo("Asia/Seoul")
DEFAULT_ASOS_BASE_URL = "https://apis.data.go.kr/1360000/AsosHourlyInfoService"
InferenceMode = Literal["latest", "fixed"]

ASOS_COLUMNS = {
    "ta": "air_temperature_c",
    "hm": "humidity_pct",
    "ws": "wind_speed_ms",
    "rn": "rainfall_mm",
    "icsr": "solar_radiation_mj_m2",
    "ss": "sunshine_hours",
}


def _as_naive_seoul(value: pd.Timestamp | datetime | str) -> pd.Timestamp:
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is not None:
        timestamp = timestamp.tz_convert(SEOUL).tz_localize(None)
    return timestamp


def _normalize_weather(raw: pd.DataFrame) -> pd.DataFrame:
    output = pd.DataFrame({"timestamp": pd.to_datetime(raw["tm"], errors="coerce")})
    for source, target in ASOS_COLUMNS.items():
        output[target] = pd.to_numeric(raw[source], errors="coerce") if source in raw else np.nan
    output = output.dropna(subset=["timestamp"]).drop_duplicates("timestamp")
    output["rainfall_mm"] = output["rainfall_mm"].fillna(0.0).clip(lower=0)
    for column in ["air_temperature_c", "humidity_pct", "wind_speed_ms"]:
        output[column] = output[column].interpolate().ffill().bfill()
    output["solar_radiation_mj_m2"] = output["solar_radiation_mj_m2"].fillna(0.0).clip(lower=0)
    return output.sort_values("timestamp").reset_index(drop=True)


def fetch_asos_range(
    start_time: pd.Timestamp,
    end_time: pd.Timestamp,
    *,
    service_key: str | None = None,
    station_id: int = 108,
    base_url: str = DEFAULT_ASOS_BASE_URL,
    timeout_seconds: float = 30.0,
) -> pd.DataFrame:
    raw_key = service_key or os.environ.get("ASOS_SERVICE_KEY", "")
    key = unquote(raw_key.strip())
    if not key:
        raise RuntimeError("ASOS_SERVICE_KEY 환경변수가 없습니다.")

    endpoint = f"{base_url.rstrip('/')}/getWthrDataList"
    params = {
        "serviceKey": key,
        "pageNo": "1",
        "numOfRows": "300",
        "dataType": "JSON",
        "dataCd": "ASOS",
        "dateCd": "HR",
        "startDt": pd.Timestamp(start_time).strftime("%Y%m%d"),
        "startHh": pd.Timestamp(start_time).strftime("%H"),
        "endDt": pd.Timestamp(end_time).strftime("%Y%m%d"),
        "endHh": pd.Timestamp(end_time).strftime("%H"),
        "stnIds": str(station_id),
    }
    request_url = f"{endpoint}?{urlencode(params)}"

    try:
        with urlopen(request_url, timeout=timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(f"ASOS API HTTP 오류 {error.code}: {body}") from error
    except URLError as error:
        raise RuntimeError(f"ASOS API 연결 오류: {error.reason}") from error
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RuntimeError("ASOS API JSON 응답을 해석하지 못했습니다.") from error

    response_data = payload.get("response", {})
    header = response_data.get("header", {})
    result_code = header.get("resultCode")
    if result_code not in (None, "00", 0):
        raise RuntimeError(f"ASOS API 오류 {result_code}: {header.get('resultMsg')}")

    items: Any = response_data.get("body", {}).get("items", {}).get("item", [])
    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list) or not items:
        raise RuntimeError("ASOS 조회 결과가 비어 있습니다.")
    return _normalize_weather(pd.DataFrame(items))


def fetch_asos_inference_window(
    *,
    service_key: str | None = None,
    station_id: int = 108,
    base_url: str = DEFAULT_ASOS_BASE_URL,
    mode: InferenceMode = "latest",
    fixed_timestamp: str = "2026-08-15T16:00:00",
    history_hours: int = 12,
    service_start_hour: int = 9,
    service_end_hour: int = 21,
    now: pd.Timestamp | datetime | None = None,
    timeout_seconds: float = 30.0,
) -> tuple[pd.DataFrame, pd.Timestamp]:
    if mode == "fixed":
        target = _as_naive_seoul(fixed_timestamp)
        if not service_start_hour <= target.hour <= service_end_hour:
            raise ValueError(
                f"고정 ASOS 시각은 {service_start_hour:02d}:00~"
                f"{service_end_hour:02d}:00 범위여야 합니다."
            )
        received = fetch_asos_range(
            target - pd.Timedelta(hours=history_hours),
            target,
            service_key=service_key,
            station_id=station_id,
            base_url=base_url,
            timeout_seconds=timeout_seconds,
        )
    else:
        current = _as_naive_seoul(now or datetime.now(SEOUL))
        # The public ASOS hourly endpoint accepts data only through D-1.
        # Querying through the current date rejects the entire request with code 99.
        query_end = current.normalize() - pd.Timedelta(hours=1)
        received = fetch_asos_range(
            query_end - pd.Timedelta(hours=history_hours + 24),
            query_end,
            service_key=service_key,
            station_id=station_id,
            base_url=base_url,
            timeout_seconds=timeout_seconds,
        )
        available = set(received["timestamp"])
        candidates = received.loc[
            received["timestamp"].dt.hour.between(
                service_start_hour,
                service_end_hour,
                inclusive="both",
            ),
            "timestamp",
        ].sort_values(ascending=False)
        target = None
        for candidate in candidates:
            expected = pd.date_range(
                candidate - pd.Timedelta(hours=history_hours),
                candidate,
                freq="h",
            )
            if set(expected).issubset(available):
                target = pd.Timestamp(candidate)
                break
        if target is None:
            raise RuntimeError(
                "최근 09~21시 ASOS 관측 중 직전 12시간 이력이 완전한 시각이 없습니다."
            )

    expected = pd.date_range(
        target - pd.Timedelta(hours=history_hours),
        target,
        freq="h",
    )
    window = received.loc[received["timestamp"].isin(expected)].copy()
    missing = sorted(set(expected).difference(window["timestamp"]))
    if missing:
        raise RuntimeError(f"축열 계산에 필요한 ASOS 시각이 누락됐습니다: {missing}")
    return window.sort_values("timestamp").reset_index(drop=True), target
