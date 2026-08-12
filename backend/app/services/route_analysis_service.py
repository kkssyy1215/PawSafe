from __future__ import annotations

import asyncio

from app.core.errors import AnalysisTimeoutError, SameLocationError
from app.providers.analysis.base import AnalysisProvider
from app.schemas.route import RouteAnalysisRequest, RouteAnalysisResponse
from app.services.coverage_service import CoverageService
from app.services.node_matching_service import haversine_m


class RouteAnalysisService:
    def __init__(
        self,
        provider: AnalysisProvider,
        coverage: CoverageService,
        *,
        min_location_distance_m: float,
        max_route_search_distance_m: float,
        timeout_seconds: float,
    ) -> None:
        self._provider = provider
        self._coverage = coverage
        self._min_distance = min_location_distance_m
        self._max_distance = max_route_search_distance_m
        self._timeout = timeout_seconds

    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        distance = haversine_m(
            request.origin.lat,
            request.origin.lng,
            request.destination.lat,
            request.destination.lng,
        )
        if distance < self._min_distance:
            raise SameLocationError()
        self._coverage.require_contains(request.origin, request.destination)
        if distance > self._max_distance:
            from app.core.errors import OutOfCoverageError

            raise OutOfCoverageError()
        try:
            async with asyncio.timeout(self._timeout):
                return await self._provider.analyze(request)
        except TimeoutError as exc:
            raise AnalysisTimeoutError() from exc
