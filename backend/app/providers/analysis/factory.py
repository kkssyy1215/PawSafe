from __future__ import annotations

import httpx

from app.core.config import Settings
from app.core.errors import AppError, PipelineNotReadyError
from app.providers.analysis.base import AnalysisProvider
from app.providers.analysis.external_analysis import ExternalAnalysisProvider
from app.providers.analysis.graph_analysis import GraphAnalysisProvider
from app.providers.analysis.kakao_walking_analysis import KakaoWalkingAnalysisProvider
from app.providers.analysis.mock_analysis import MockAnalysisProvider
from app.providers.heat_cost.base import HeatCostProvider
from app.providers.shortest_route.base import ShortestRouteProvider
from app.providers.shortest_route.internal_graph import InternalGraphShortestRouteProvider
from app.repositories.graph_repository import GraphData
from app.repositories.heat_cost_repository import HeatCostRepository
from app.schemas.route import RouteAnalysisRequest, RouteAnalysisResponse
from app.services.node_matching_service import NodeMatchingService
from app.services.route_cost_service import WalkModeConfig, WeightedHeatRouteCostStrategy
from app.services.route_statistics_service import RouteStatisticsService


class UnavailableAnalysisProvider:
    def __init__(self, error: AppError) -> None:
        self._error = error

    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        del request
        raise self._error


def create_analysis_provider(
    settings: Settings,
    *,
    client: httpx.AsyncClient,
    graph_data: GraphData | None,
    heat_provider: HeatCostProvider | None,
    shortest_route_provider: ShortestRouteProvider | None,
    walk_modes: WalkModeConfig | None,
    readiness_error: AppError | None = None,
) -> AnalysisProvider:
    if settings.analysis_provider == "mock":
        return MockAnalysisProvider(settings.resolve_path(settings.mock_scenarios_file_path))
    if settings.analysis_provider == "external":
        if not settings.analysis_external_url:
            return UnavailableAnalysisProvider(PipelineNotReadyError("analysis_external_url"))
        return ExternalAnalysisProvider(
            client,
            settings.analysis_external_url,
            timeout_seconds=settings.request_timeout_seconds,
        )
    if settings.analysis_provider == "kakao_walk":
        if not settings.kakao_rest_api_key:
            return UnavailableAnalysisProvider(PipelineNotReadyError("kakao_rest_api_key"))
        return KakaoWalkingAnalysisProvider(
            client,
            api_key=settings.kakao_rest_api_key,
            mock_scenarios_path=settings.resolve_path(settings.mock_scenarios_file_path),
            timeout_seconds=settings.request_timeout_seconds,
        )
    if not graph_data or not heat_provider or not shortest_route_provider or not walk_modes:
        return UnavailableAnalysisProvider(
            readiness_error or PipelineNotReadyError("graph_or_heat_data")
        )
    heat_repository = HeatCostRepository(
        missing_policy=settings.heat_missing_policy,
        conservative_heat_cost=settings.conservative_missing_heat_cost,
    )
    return GraphAnalysisProvider(
        graph_data=graph_data,
        heat_provider=heat_provider,
        heat_repository=heat_repository,
        shortest_route_provider=shortest_route_provider,
        pawsafe_route_provider=InternalGraphShortestRouteProvider(graph_data),
        node_matching=NodeMatchingService(
            graph_data,
            max_distance_m=settings.max_node_match_distance_m,
        ),
        statistics=RouteStatisticsService(
            heat_repository,
            walking_speed_m_per_minute=settings.walking_speed_m_per_minute,
        ),
        cost_strategy=WeightedHeatRouteCostStrategy(),
        walk_modes=walk_modes,
        shortest_route_source=settings.shortest_route_provider,
        pawsafe_route_source="internal_graph",
    )
