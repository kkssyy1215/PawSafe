from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from app.providers.analysis.walk_mode_analysis import WalkModeAnalysisProvider
from app.schemas.route import RouteAnalysisRequest


def _request(mode: str) -> RouteAnalysisRequest:
    return RouteAnalysisRequest.model_validate(
        {
            "origin": {
                "id": "origin",
                "name": "출발",
                "address": "서울 송파구",
                "lat": 37.48508,
                "lng": 127.11261,
            },
            "destination": {
                "id": "destination",
                "name": "도착",
                "address": "서울 송파구",
                "lat": 37.48804,
                "lng": 127.15297,
            },
            "departure_at": datetime.fromisoformat("2026-08-15T17:30:00+09:00"),
            "walk_mode": mode,
        }
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(("mode", "expected"), [("fast", "fast"), ("cool", "cool")])
async def test_routes_each_walk_mode_to_its_provider(mode: str, expected: str) -> None:
    fast_provider = AsyncMock()
    cool_provider = AsyncMock()
    fast_provider.analyze.return_value = "fast"
    cool_provider.analyze.return_value = "cool"
    provider = WalkModeAnalysisProvider(
        fast_provider=fast_provider,
        cool_provider=cool_provider,
    )

    result = await provider.analyze(_request(mode))

    assert result == expected
    if mode == "fast":
        fast_provider.analyze.assert_awaited_once()
        cool_provider.analyze.assert_not_awaited()
    else:
        fast_provider.analyze.assert_not_awaited()
        cool_provider.analyze.assert_awaited_once()
