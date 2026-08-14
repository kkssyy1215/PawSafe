from __future__ import annotations

from datetime import datetime
from pathlib import Path

import httpx
import pytest

from app.providers.analysis.kakao_walking_analysis import KakaoWalkingAnalysisProvider
from app.schemas.route import RouteAnalysisRequest


@pytest.mark.asyncio
async def test_kakao_walk_maps_shortest_route_and_keeps_demo_heat_fixture() -> None:
    captured: dict[str, str] = {}

    async def handler(request: httpx.Request) -> httpx.Response:
        captured.update({key: value for key, value in request.url.params.multi_items()})
        return httpx.Response(
            200,
            json={
                "status": "OK",
                "route": {
                    "properties": {"totalDistance": 1500, "totalTime": 900},
                    "legs": [
                        {
                            "steps": [
                                {
                                    "path": {
                                        "points": [
                                            [126.91, 37.55],
                                            [126.905, 37.552],
                                            [126.9, 37.555],
                                        ]
                                    }
                                }
                            ]
                        }
                    ],
                },
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        provider = KakaoWalkingAnalysisProvider(
            client,
            api_key="server-only-key",
            mock_scenarios_path=Path(__file__).parents[2] / "app/fixtures/demo_scenarios.json",
            timeout_seconds=5,
        )
        result = await provider.analyze(
            RouteAnalysisRequest(
                origin={
                    "id": "place_home",
                    "name": "우리집",
                    "address": "서울특별시 마포구 독막로 12",
                    "lat": 37.55,
                    "lng": 126.91,
                },
                destination={
                    "id": "place_mangwon_park",
                    "name": "망원한강공원",
                    "address": "서울특별시 마포구 마포나루길 467",
                    "lat": 37.555,
                    "lng": 126.9,
                },
                departure_at=datetime.fromisoformat("2026-08-14T18:30:00+09:00"),
                walk_mode="cool",
            )
        )

    assert captured["route_mode"] == "SHORTEST"
    assert captured["input_coord"] == "WGS84"
    assert captured["output_coord"] == "WGS84"
    assert result.shortest.route_source == "kakao_walk"
    assert result.shortest.distance_m == 1500
    assert result.shortest.duration_min == 15
    assert result.shortest.geometry.coordinates == [
        (126.91, 37.55),
        (126.905, 37.552),
        (126.9, 37.555),
    ]
    assert result.pawsafe.route_source == "mock_fixture"
    assert result.analysis_source == "kakao_walk+mock_heat_fixture"
    assert result.is_demo is True
    assert any(warning.code == "KAKAO_SHORTEST_WITH_DEMO_HEAT" for warning in result.warnings)


@pytest.mark.asyncio
async def test_kakao_walk_fast_recommends_the_live_shortest_geometry() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        del request
        return httpx.Response(
            200,
            json={
                "status": "OK",
                "route": {
                    "properties": {"totalDistance": 900, "totalTime": 480},
                    "legs": [
                        {
                            "steps": [
                                {
                                    "path": {
                                        "points": [[126.91, 37.55], [126.9, 37.555]]
                                    }
                                }
                            ]
                        }
                    ],
                },
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        provider = KakaoWalkingAnalysisProvider(
            client,
            api_key="server-only-key",
            mock_scenarios_path=Path(__file__).parents[2] / "app/fixtures/demo_scenarios.json",
            timeout_seconds=5,
        )
        result = await provider.analyze(
            RouteAnalysisRequest(
                origin={
                    "id": "place_home",
                    "name": "우리집",
                    "address": "서울특별시 마포구 독막로 12",
                    "lat": 37.55,
                    "lng": 126.91,
                },
                destination={
                    "id": "place_mangwon_park",
                    "name": "망원한강공원",
                    "address": "서울특별시 마포구 마포나루길 467",
                    "lat": 37.555,
                    "lng": 126.9,
                },
                departure_at=datetime.fromisoformat("2026-08-14T18:30:00+09:00"),
                walk_mode="fast",
            )
        )

    assert result.pawsafe.route_source == "kakao_walk"
    assert result.pawsafe.route_id == "kakao_fast"
    assert result.pawsafe.label == "빠른 산책길(카카오 최단)"
    assert result.pawsafe.geometry == result.shortest.geometry
    assert result.pawsafe.distance_m == result.shortest.distance_m == 900
    assert result.comparison.same_route is True
    assert result.heat_segments == []
