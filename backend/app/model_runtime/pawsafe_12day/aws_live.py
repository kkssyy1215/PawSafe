from __future__ import annotations

import os
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode
from urllib.request import urlopen
from zoneinfo import ZoneInfo

import pandas as pd

SEOUL = ZoneInfo("Asia/Seoul")
AWS_ENDPOINT = "https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-aws2_min"

AWS_COLUMNS = [
    "raw_time",
    "station_id",
    "wd1_deg",
    "ws1_ms",
    "wds_deg",
    "wss_ms",
    "wd10_deg",
    "ws10_ms",
    "air_temperature_raw",
    "rain_event",
    "rainfall_15m_mm",
    "rainfall_60m_mm",
    "rainfall_12h_mm",
    "rainfall_day_mm",
    "humidity_raw",
    "pressure_local",
    "pressure_sea",
    "dew_point",
    "quality",
]


def fetch_live_aws(
    *,
    auth_key: str | None = None,
    station_id: str = "108",
    window_hours: int = 6,
    now: pd.Timestamp | None = None,
) -> tuple[pd.DataFrame, pd.Timestamp]:
    raw_key = auth_key or os.environ.get("KMA_AWS_AUTH_KEY", "")
    key = unquote(raw_key.strip())

    if not key:
        raise RuntimeError("KMA_AWS_AUTH_KEY 환경변수가 없습니다.")
    if key.startswith("http") or "authKey=" in key:
        raise RuntimeError("KMA_AWS_AUTH_KEY에는 URL이 아닌 인증키만 입력해야 합니다.")

    target = now or pd.Timestamp.now(tz=SEOUL)
    target = pd.Timestamp(target)

    target = target.tz_localize(SEOUL) if target.tzinfo is None else target.tz_convert(SEOUL)

    target = target.floor("min")
    start = target - pd.Timedelta(hours=window_hours)

    params = {
        "tm1": start.strftime("%Y%m%d%H%M"),
        "tm2": target.strftime("%Y%m%d%H%M"),
        "stn": station_id,
        "disp": "1",
        "help": "0",
        "authKey": key,
    }

    request_url = f"{AWS_ENDPOINT}?{urlencode(params)}"

    try:
        with urlopen(request_url, timeout=30) as response:
            text = response.read().decode("utf-8", errors="replace")
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(f"AWS API HTTP 오류 {error.code}: {body}") from error
    except URLError as error:
        raise RuntimeError(f"AWS API 연결 오류: {error.reason}") from error

    rows = []

    for line in text.splitlines():
        line = line.strip()

        if not line or line.startswith("#") or line.startswith("="):
            continue

        values = [value.strip() for value in line.split(",")]

        if len(values) >= len(AWS_COLUMNS):
            rows.append(values[: len(AWS_COLUMNS)])

    if not rows:
        raise RuntimeError("AWS API에서 관측자료를 받지 못했습니다.")

    data = pd.DataFrame(rows, columns=AWS_COLUMNS)

    data["timestamp"] = pd.to_datetime(
        data["raw_time"],
        format="%Y%m%d%H%M",
        errors="coerce",
    )

    numeric_columns = [
        "ws1_ms",
        "ws10_ms",
        "air_temperature_raw",
        "rainfall_15m_mm",
        "rainfall_60m_mm",
        "humidity_raw",
    ]

    for column in numeric_columns:
        data[column] = pd.to_numeric(data[column], errors="coerce")
        data.loc[data[column] <= -90, column] = pd.NA

    result = pd.DataFrame(
        {
            "timestamp": data["timestamp"],
            "air_temperature_c": data["air_temperature_raw"],
            "humidity_pct": data["humidity_raw"],
            "wind_speed_ms": data["ws10_ms"].fillna(data["ws1_ms"]),
            "rainfall_mm": data["rainfall_60m_mm"].fillna(data["rainfall_15m_mm"]).fillna(0.0),
            # AWS 매분자료에는 하늘상태가 없으므로
            # 기존 ASOS 일사 기준값을 사용하는 중립값으로 둠
            "sky_code": 4,
        }
    )

    result = result.dropna(subset=["timestamp"])
    result["wind_speed_ms"] = result["wind_speed_ms"].fillna(0.0).clip(lower=0)
    result["rainfall_mm"] = result["rainfall_mm"].clip(lower=0)
    result = result.sort_values("timestamp").reset_index(drop=True)

    if result.empty:
        raise RuntimeError("유효한 AWS 관측자료가 없습니다.")

    return result, target.tz_localize(None)
