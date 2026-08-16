from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import pandas as pd
import pytest

from app.core.config import Settings
from app.providers.analysis.pawsafe_12day import Pawsafe12DayAnalysisProvider
from app.schemas.route import RouteAnalysisRequest


def _fake_aws_weather(**_: object) -> tuple[pd.DataFrame, pd.Timestamp]:
    timestamps = pd.date_range("2026-08-16 12:00", periods=7, freq="1h")
    return (
        pd.DataFrame(
            {
                "timestamp": timestamps,
                "air_temperature_c": [30.0, 31.0, 32.0, 33.0, 33.5, 33.0, 32.0],
                "humidity_pct": [65.0, 62.0, 60.0, 58.0, 57.0, 59.0, 61.0],
                "wind_speed_ms": [1.2, 1.4, 1.8, 2.0, 2.1, 1.9, 1.6],
                "rainfall_mm": [0.0] * 7,
                "sky_code": [4] * 7,
            }
        ),
        pd.Timestamp("2026-08-16 18:00"),
    )


@pytest.mark.asyncio
async def test_12day_model_scores_real_assets_and_returns_app_contract() -> None:
    settings = Settings(_env_file=None)
    provider = Pawsafe12DayAnalysisProvider(
        config_path=settings.resolve_path(settings.pawsafe_12day_config_path),
        aws_auth_key="test-aws-key",
        walking_speed_m_per_minute=70,
        weather_fetcher=_fake_aws_weather,
    )
    request = RouteAnalysisRequest.model_validate(
        {
            "origin": {
                "id": "heat_diff_start",
                "name": "위례광장로 185",
                "address": "서울특별시 송파구 위례광장로 185",
                "lat": 37.4811743,
                "lng": 127.1405973,
            },
            "destination": {
                "id": "heat_diff_end",
                "name": "목업 목적지",
                "address": "서울특별시 송파구 위례동",
                "lat": 37.4772949,
                "lng": 127.1410705,
            },
            "departure_at": datetime(2026, 8, 16, 18, 0, tzinfo=ZoneInfo("Asia/Seoul")),
            "walk_mode": "cool",
        }
    )

    response = await provider.analyze(request)

    assert response.analysis_source == "pawsafe_12day_aws_live"
    assert response.is_demo is False
    assert response.graph_version == "pawsafe-12day-edges-3797"
    assert response.data_valid_at == datetime(2026, 8, 16, 18, 0, tzinfo=ZoneInfo("Asia/Seoul"))
    assert response.weight_profile.id == "pawsafe_12day_cool_0.95"
    assert response.shortest.distance_m > 0
    assert response.pawsafe.distance_m > 0
    assert 0 <= response.shortest.heat_cost <= 100
    assert 0 <= response.pawsafe.heat_cost <= 100
    assert response.pawsafe.heat_cost <= response.shortest.heat_cost
    assert response.shortest.geometry.coordinates
    assert response.pawsafe.geometry.coordinates
    assert response.heat_segments
    assert {segment.level for segment in response.heat_segments} <= {
        "low",
        "medium",
        "high",
    }
