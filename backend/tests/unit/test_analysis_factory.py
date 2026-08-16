from __future__ import annotations

from unittest.mock import AsyncMock

import httpx

from app.core.config import Settings
from app.providers.analysis.factory import create_analysis_provider
from app.providers.analysis.walk_mode_analysis import WalkModeAnalysisProvider


def _create(settings: Settings) -> object:
    return create_analysis_provider(
        settings,
        client=AsyncMock(spec=httpx.AsyncClient),
        graph_data=None,
        heat_provider=None,
        shortest_route_provider=None,
        walk_modes=None,
    )


def test_external_model_is_used_only_for_cool_when_kakao_is_configured() -> None:
    settings = Settings(
        _env_file=None,
        analysis_provider="external",
        analysis_external_url="https://model.example.com/routes",
        kakao_rest_api_key="test-kakao-key",
    )

    provider = _create(settings)

    assert isinstance(provider, WalkModeAnalysisProvider)


def test_external_model_does_not_replace_fast_route_without_kakao_key() -> None:
    settings = Settings(
        _env_file=None,
        analysis_provider="external",
        analysis_external_url="https://model.example.com/routes",
        kakao_rest_api_key=None,
    )

    provider = _create(settings)

    assert isinstance(provider, WalkModeAnalysisProvider)


def test_12day_model_is_used_only_for_cool_when_keys_are_configured() -> None:
    settings = Settings(
        _env_file=None,
        analysis_provider="pawsafe_12day",
        kma_aws_auth_key="test-aws-key",
        kakao_rest_api_key="test-kakao-key",
    )

    provider = _create(settings)

    assert isinstance(provider, WalkModeAnalysisProvider)


def test_12day_model_keeps_walk_mode_split_when_aws_key_is_missing() -> None:
    settings = Settings(
        _env_file=None,
        analysis_provider="pawsafe_12day",
        kma_aws_auth_key=None,
        kakao_rest_api_key="test-kakao-key",
    )

    provider = _create(settings)

    assert isinstance(provider, WalkModeAnalysisProvider)
