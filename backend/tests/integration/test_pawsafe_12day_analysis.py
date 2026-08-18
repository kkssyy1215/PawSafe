from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import pandas as pd
import pytest

from app.core.config import Settings
from app.providers.analysis.pawsafe_12day import Pawsafe12DayAnalysisProvider
from app.schemas.route import RouteAnalysisRequest


def _fake_asos_weather(**_: object) -> tuple[pd.DataFrame, pd.Timestamp]:
    timestamps = pd.date_range("2026-08-16 06:00", periods=13, freq="1h")
    return (
        pd.DataFrame(
            {
                "timestamp": timestamps,
                "air_temperature_c": [
                    24.0,
                    25.0,
                    26.0,
                    27.0,
                    28.0,
                    29.0,
                    30.0,
                    31.0,
                    32.0,
                    33.0,
                    33.5,
                    33.0,
                    32.0,
                ],
                "humidity_pct": [
                    76.0,
                    73.0,
                    70.0,
                    68.0,
                    66.0,
                    64.0,
                    62.0,
                    60.0,
                    58.0,
                    57.0,
                    56.0,
                    59.0,
                    61.0,
                ],
                "wind_speed_ms": [
                    0.8,
                    0.9,
                    1.0,
                    1.1,
                    1.2,
                    1.3,
                    1.4,
                    1.6,
                    1.8,
                    2.0,
                    2.1,
                    1.9,
                    1.6,
                ],
                "rainfall_mm": [0.0] * 13,
                "solar_radiation_mj_m2": [
                    0.3,
                    0.7,
                    1.2,
                    1.8,
                    2.3,
                    2.7,
                    3.0,
                    2.8,
                    2.4,
                    1.9,
                    1.3,
                    0.7,
                    0.2,
                ],
            }
        ),
        pd.Timestamp("2026-08-16 18:00"),
    )


@pytest.mark.asyncio
async def test_12day_model_scores_real_assets_and_returns_app_contract() -> None:
    settings = Settings(_env_file=None)
    provider = Pawsafe12DayAnalysisProvider(
        config_path=settings.resolve_path(settings.pawsafe_12day_config_path),
        asos_service_key="test-asos-key",
        asos_base_url=settings.asos_base_url,
        asos_station_id=108,
        asos_inference_mode="latest",
        asos_fixed_timestamp="2026-08-15T16:00:00",
        walking_speed_m_per_minute=70,
        weather_fetcher=_fake_asos_weather,
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
    fast_response = await provider.analyze(request.model_copy(update={"walk_mode": "fast"}))

    assert response.analysis_source == "pawsafe_summer_09_21_12day_v5_asos_latest"
    assert response.is_demo is False
    assert response.graph_version == "pawsafe-summer-09-21-12day-v5-edges-3797"
    assert response.data_valid_at == datetime(2026, 8, 16, 18, 0, tzinfo=ZoneInfo("Asia/Seoul"))
    assert response.weight_profile.id == "pawsafe_summer_09_21_cool_0.95"
    assert response.heat_data_version == ("pawsafe-summer-09-21-12day-v5-asos-108-202608161800")
    assert response.shortest.distance_m > 0
    assert response.pawsafe.distance_m > 0
    assert 0 <= response.shortest.heat_cost <= 100
    assert 0 <= response.pawsafe.heat_cost <= 100
    assert response.pawsafe.heat_cost <= response.shortest.heat_cost
    assert response.shortest.geometry.coordinates
    assert response.pawsafe.geometry.coordinates
    assert fast_response.shortest.route_id == response.shortest.route_id
    assert fast_response.shortest.distance_m == response.shortest.distance_m
    assert fast_response.shortest.geometry == response.shortest.geometry
    assert response.heat_segments
    assert {segment.level for segment in response.heat_segments} <= {
        "low",
        "medium",
        "high",
    }


@pytest.mark.asyncio
async def test_12day_model_marks_fixed_asos_demo_result() -> None:
    settings = Settings(_env_file=None)
    provider = Pawsafe12DayAnalysisProvider(
        config_path=settings.resolve_path(settings.pawsafe_12day_config_path),
        asos_service_key="test-asos-key",
        asos_base_url=settings.asos_base_url,
        asos_station_id=108,
        asos_inference_mode="fixed",
        asos_fixed_timestamp="2026-08-15T16:00:00",
        walking_speed_m_per_minute=70,
        weather_fetcher=_fake_asos_weather,
    )
    request = RouteAnalysisRequest.model_validate(
        {
            "origin": {
                "id": "fixed_origin",
                "name": "위례광장로 185",
                "address": "서울특별시 송파구 위례광장로 185",
                "lat": 37.4811743,
                "lng": 127.1405973,
            },
            "destination": {
                "id": "fixed_destination",
                "name": "장지동 900-2",
                "address": "서울특별시 송파구 장지동 900-2",
                "lat": 37.4772949,
                "lng": 127.1410705,
            },
            "walk_mode": "cool",
        }
    )

    response = await provider.analyze(request)

    assert response.analysis_source == "pawsafe_summer_09_21_12day_v5_asos_fixed"
    assert any(warning.code == "ASOS_FIXED_DEMO_OBSERVATION" for warning in response.warnings)
