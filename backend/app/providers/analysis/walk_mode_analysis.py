from __future__ import annotations

from app.providers.analysis.base import AnalysisProvider
from app.schemas.route import RouteAnalysisRequest, RouteAnalysisResponse


class WalkModeAnalysisProvider:
    """Route fast requests to Kakao and cool requests to the configured heat model."""

    def __init__(
        self,
        *,
        fast_provider: AnalysisProvider,
        cool_provider: AnalysisProvider,
    ) -> None:
        self._fast_provider = fast_provider
        self._cool_provider = cool_provider

    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        provider = self._fast_provider if request.walk_mode == "fast" else self._cool_provider
        return await provider.analyze(request)
