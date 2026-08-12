from __future__ import annotations

from typing import Protocol

from app.schemas.route import RouteAnalysisRequest, RouteAnalysisResponse


class AnalysisProvider(Protocol):
    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse: ...
