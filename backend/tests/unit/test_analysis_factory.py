from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock

import httpx

from app.core.config import Settings
from app.providers.analysis.external_analysis import ExternalAnalysisProvider
from app.providers.analysis.factory import UnavailableAnalysisProvider, create_analysis_provider
from app.providers.analysis.ongil_gmm import OngilGmmAnalysisProvider


def _create(settings: Settings) -> object:
    return create_analysis_provider(
        settings,
        client=AsyncMock(spec=httpx.AsyncClient),
        graph_data=None,
        heat_provider=None,
        shortest_route_provider=None,
        walk_modes=None,
    )


def test_final_gmm_provider_requires_no_weather_or_kakao_key() -> None:
    settings = Settings(
        _env_file=None,
        analysis_provider="ongil_gmm",
        asos_service_key=None,
        kakao_rest_api_key=None,
    )
    assert isinstance(_create(settings), OngilGmmAnalysisProvider)


def test_missing_gmm_assets_make_provider_unavailable(tmp_path: Path) -> None:
    settings = Settings(
        _env_file=None,
        analysis_provider="ongil_gmm",
        ongil_gmm_model_path=tmp_path,
    )
    assert isinstance(_create(settings), UnavailableAnalysisProvider)


def test_external_provider_is_used_directly() -> None:
    settings = Settings(
        _env_file=None,
        analysis_provider="external",
        analysis_external_url="https://model.example.com/routes",
    )
    assert isinstance(_create(settings), ExternalAnalysisProvider)
