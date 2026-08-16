"""KMA short-term forecast retrieval and future feature construction.

The KMA forecast is an online input. ASOS remains the historical baseline
used to fill the few fields that the short-term forecast does not provide,
most importantly hourly solar radiation.
"""

from __future__ import annotations

import json
import math
import os
from datetime import datetime, timedelta
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode
from urllib.request import urlopen
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

from .features import build_edge_time_features

SEOUL = ZoneInfo("Asia/Seoul")
KMA_ENDPOINT = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"


def lonlat_to_kma_grid(lon: float, lat: float) -> tuple[int, int]:
    """Convert WGS84 longitude/latitude to the KMA Lambert grid."""

    re = 6371.00877 / 5.0
    slat1 = math.radians(30.0)
    slat2 = math.radians(60.0)
    olon = math.radians(126.0)
    olat = math.radians(38.0)
    xo = 43.0
    yo = 136.0

    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(
        math.tan(math.pi / 4.0 + slat2 / 2.0) / math.tan(math.pi / 4.0 + slat1 / 2.0)
    )
    sf = math.tan(math.pi / 4.0 + slat1 / 2.0) ** sn * math.cos(slat1) / sn
    ro = re * sf / math.tan(math.pi / 4.0 + olat / 2.0) ** sn

    ra = re * sf / math.tan(math.pi / 4.0 + math.radians(lat) / 2.0) ** sn
    theta = (math.radians(lon) - olon) * sn

    x = math.floor(ra * math.sin(theta) + xo + 0.5)
    y = math.floor(ro - ra * math.cos(theta) + yo + 0.5)
    return x, y


def latest_base_datetime(now: datetime | None = None) -> datetime:
    """Return the latest short-forecast release likely available."""

    now = now or datetime.now(SEOUL)
    if now.tzinfo is None:
        now = now.replace(tzinfo=SEOUL)

    available_at = now - timedelta(minutes=10)
    release_hours = (2, 5, 8, 11, 14, 17, 20, 23)
    candidates = [
        datetime(
            available_at.year,
            available_at.month,
            available_at.day,
            hour,
            tzinfo=SEOUL,
        )
        for hour in release_hours
    ]
    past = [candidate for candidate in candidates if candidate <= available_at]
    if past:
        return max(past)

    previous_day = available_at - timedelta(days=1)
    return datetime(
        previous_day.year,
        previous_day.month,
        previous_day.day,
        23,
        tzinfo=SEOUL,
    )


def _as_list(items: Any) -> list[dict[str, Any]]:
    if not items:
        return []
    if isinstance(items, dict):
        return [items]
    return list(items)


def _parse_number(value: Any) -> float | None:
    if value is None or str(value).strip() in {"", "-", "--"}:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_rainfall(value: Any) -> float:
    """Convert KMA PCP strings such as '강수없음' or '1~4' to mm."""

    text = str(value or "").strip()
    if not text or text in {"강수없음", "적설없음", "없음", "-", "--"}:
        return 0.0

    numbers = []
    current = ""
    for char in text:
        if char.isdigit() or char == ".":
            current += char
        elif current:
            numbers.append(float(current))
            current = ""
    if current:
        numbers.append(float(current))

    if not numbers:
        return 0.0
    return float(sum(numbers) / len(numbers))


def _sky_factor(value: Any) -> float:
    # KMA SKY: 1 clear, 3 partly cloudy, 4 cloudy.
    code = int(_parse_number(value) or 4)
    return {1: 1.0, 3: 0.72, 4: 0.45}.get(code, 0.6)


def fetch_short_forecast(
    service_key: str | None = None,
    *,
    latitude: float,
    longitude: float,
    now: datetime | None = None,
) -> tuple[pd.DataFrame, datetime]:
    """Fetch KMA forecast rows without exposing the service key."""

    raw_key = service_key or os.environ.get("KMA_SERVICE_KEY", "")
    key = unquote(raw_key.strip())
    if not key:
        raise RuntimeError("KMA_SERVICE_KEY 환경변수가 없습니다.")

    nx, ny = lonlat_to_kma_grid(longitude, latitude)
    base = latest_base_datetime(now)
    params = {
        "serviceKey": key,
        "pageNo": "1",
        "numOfRows": "1000",
        "dataType": "JSON",
        "base_date": base.strftime("%Y%m%d"),
        "base_time": base.strftime("%H%M"),
        "nx": str(nx),
        "ny": str(ny),
    }
    request_url = f"{KMA_ENDPOINT}?{urlencode(params)}"

    try:
        with urlopen(request_url, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(f"기상청 API HTTP 오류 {error.code}: {body}") from error
    except URLError as error:
        raise RuntimeError(f"기상청 API 연결 오류: {error.reason}") from error

    response = payload.get("response", {})
    header = response.get("header", {})
    if str(header.get("resultCode")) != "00":
        raise RuntimeError(f"기상청 API 오류 {header.get('resultCode')}: {header.get('resultMsg')}")

    body = response.get("body", {})
    items = _as_list(body.get("items", {}).get("item"))
    if not items:
        raise RuntimeError("기상청 단기예보 응답에 예보 자료가 없습니다.")

    grouped: dict[pd.Timestamp, dict[str, Any]] = {}
    for item in items:
        try:
            timestamp = pd.to_datetime(
                f"{item['fcstDate']}{item['fcstTime']}",
                format="%Y%m%d%H%M",
            )
        except (KeyError, ValueError):
            continue
        grouped.setdefault(timestamp, {})[str(item.get("category"))] = item.get("fcstValue")

    rows = []
    for timestamp, values in sorted(grouped.items()):
        rows.append(
            {
                "timestamp": timestamp,
                "air_temperature_c": _parse_number(values.get("TMP")),
                "humidity_pct": _parse_number(values.get("REH")),
                "wind_speed_ms": _parse_number(values.get("WSD")),
                "rainfall_mm": parse_rainfall(values.get("PCP")),
                "sky_code": _parse_number(values.get("SKY")),
            }
        )

    forecast = pd.DataFrame(rows)
    if forecast.empty:
        raise RuntimeError("기상청 예보에서 시간별 자료를 만들지 못했습니다.")
    forecast["timestamp"] = pd.to_datetime(forecast["timestamp"])
    return forecast.sort_values("timestamp").reset_index(drop=True), base


def choose_forecast_timestamp(
    forecast: pd.DataFrame,
    requested_timestamp: pd.Timestamp,
    tolerance: pd.Timedelta = pd.Timedelta("90min"),
) -> pd.Timestamp:
    requested = pd.Timestamp(requested_timestamp)
    if requested.tzinfo is not None:
        requested = requested.tz_convert(None)
    available = forecast["timestamp"].dropna().drop_duplicates().sort_values()
    if available.empty:
        raise ValueError("사용 가능한 KMA 예보 시간이 없습니다.")
    deltas = abs(available - requested)
    matched = available.iloc[int(deltas.to_numpy().argmin())]
    if abs(matched - requested) > tolerance:
        raise ValueError(
            "요청한 시간에 가까운 단기예보가 없습니다. 예보가 제공되는 미래 시간으로 선택해 주세요."
        )
    return pd.Timestamp(matched)


def _historical_solar_profile(baseline: pd.DataFrame) -> dict[int, float]:
    if baseline.empty:
        return {}
    data = baseline.copy()
    data["hour"] = pd.to_datetime(data["timestamp"]).dt.hour
    profile = data.groupby("hour")["solar_radiation_mj_m2"].median().clip(lower=0).to_dict()
    return {int(hour): float(value) for hour, value in profile.items()}


def _estimate_solar_radiation(
    timestamp: pd.Timestamp,
    sky_code: Any,
    baseline_profile: dict[int, float],
    cfg: dict,
) -> float:
    from .shadow import solar_position

    altitude, _ = solar_position(
        timestamp,
        cfg["location"]["latitude"],
        cfg["location"]["longitude"],
        cfg["timezone"],
    )
    if altitude <= 0:
        return 0.0

    historical = baseline_profile.get(int(timestamp.hour), 0.0)
    if historical <= 0:
        # Transparent fallback for hours absent from a tiny ASOS baseline.
        historical = 3.0 * max(0.0, math.sin(math.radians(altitude)))
    return max(0.0, historical * _sky_factor(sky_code))


def _nearest_baseline_row(
    baseline: pd.DataFrame,
    timestamp: pd.Timestamp,
) -> pd.Series | None:
    if baseline.empty:
        return None
    data = baseline.copy()
    data["hour_distance"] = abs(pd.to_datetime(data["timestamp"]).dt.hour - timestamp.hour)
    return data.sort_values("hour_distance").iloc[0]


def build_forecast_weather_window(
    forecast: pd.DataFrame,
    baseline: pd.DataFrame,
    target_timestamp: pd.Timestamp,
    cfg: dict,
) -> tuple[pd.DataFrame, pd.Timestamp]:
    """Create the same weather columns consumed by the feature pipeline."""

    target = choose_forecast_timestamp(forecast, target_timestamp)
    interval = int(cfg["time"]["shadow_interval_minutes"])
    window_hours = float(cfg["time"]["cumulative_window_hours"])
    times = pd.date_range(
        target - pd.Timedelta(hours=window_hours),
        target,
        freq=f"{interval}min",
    )
    forecast = forecast.copy()
    forecast["timestamp"] = pd.to_datetime(forecast["timestamp"])
    baseline = baseline.copy()
    baseline["timestamp"] = pd.to_datetime(baseline["timestamp"])
    solar_profile = _historical_solar_profile(baseline)

    rows = []
    for timestamp in times:
        deltas = abs(forecast["timestamp"] - timestamp)
        nearest_index = deltas.idxmin()
        nearest = forecast.loc[nearest_index]
        if deltas.loc[nearest_index] <= pd.Timedelta("90min"):
            row = nearest
        else:
            fallback = _nearest_baseline_row(baseline, timestamp)
            row = fallback if fallback is not None else pd.Series(dtype=object)

        def value(name: str, default: float = 0.0, source: pd.Series = row) -> float:
            number = _parse_number(source.get(name))
            return default if number is None else number

        rows.append(
            {
                "timestamp": timestamp,
                "air_temperature_c": value("air_temperature_c"),
                "humidity_pct": value("humidity_pct"),
                "wind_speed_ms": max(0.0, value("wind_speed_ms")),
                "rainfall_mm": max(0.0, value("rainfall_mm")),
                "solar_radiation_mj_m2": _estimate_solar_radiation(
                    timestamp,
                    row.get("sky_code", 4),
                    solar_profile,
                    cfg,
                ),
            }
        )

    return pd.DataFrame(rows), target


def build_forecast_features(
    edges,
    buildings,
    trees,
    forecast: pd.DataFrame,
    baseline: pd.DataFrame,
    target_timestamp: pd.Timestamp,
    cfg: dict,
    historical_features: pd.DataFrame | None = None,
) -> tuple[pd.DataFrame, pd.Timestamp]:
    weather, matched = build_forecast_weather_window(
        forecast,
        baseline,
        target_timestamp,
        cfg,
    )
    if historical_features is not None:
        shadows = _reuse_historical_shadows(
            historical_features,
            weather["timestamp"],
        )
    else:
        from .shadow import calculate_shadows

        shadows = calculate_shadows(
            edges,
            buildings,
            trees,
            weather["timestamp"],
            cfg,
        )
    features = build_edge_time_features(edges, shadows, weather, cfg)
    return features, matched


def _reuse_historical_shadows(
    historical_features: pd.DataFrame,
    target_times: pd.Series,
) -> pd.DataFrame:
    """Reuse precomputed spatial shade for fast online demo inference.

    Shade is driven mainly by geometry and time of day. The weather-dependent
    solar and heat-storage fields are recomputed from KMA weather afterwards.
    """

    required = {"edge_id", "timestamp", "shade_ratio"}
    missing = required.difference(historical_features.columns)
    if missing:
        raise ValueError(f"기존 Feature에 필요한 그림자 컬럼이 없습니다: {sorted(missing)}")

    history = historical_features[["edge_id", "timestamp", "shade_ratio"]].copy()
    history["timestamp"] = pd.to_datetime(history["timestamp"])
    history = history.dropna(subset=["timestamp"]).drop_duplicates(["edge_id", "timestamp"])
    available = history["timestamp"].drop_duplicates().sort_values()
    if available.empty:
        raise ValueError("재사용할 기존 그림자 시각이 없습니다.")

    available_minutes = (available.dt.hour * 60 + available.dt.minute).to_numpy()
    frames = []
    for target_time in pd.to_datetime(target_times):
        minute = int(target_time.hour * 60 + target_time.minute)
        distance = abs(available_minutes - minute)
        distance = np.minimum(distance, 1440 - distance)
        best_minute = int(distance.min())
        candidates = available[distance == best_minute]
        source_time = candidates.iloc[-1]
        snapshot = history[history["timestamp"].eq(source_time)].copy()
        snapshot["timestamp"] = target_time
        frames.append(snapshot)

    return pd.concat(frames, ignore_index=True)
