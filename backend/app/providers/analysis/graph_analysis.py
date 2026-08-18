from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from app.providers.analysis.base import AnalysisProvider
from app.providers.heat_cost.base import HeatCostProvider
from app.providers.shortest_route.base import ShortestRouteProvider
from app.repositories.graph_repository import GraphData
from app.repositories.heat_cost_repository import HeatCostRepository
from app.schemas.common import WarningMessage, WeightProfileResponse
from app.schemas.route import RouteAnalysisRequest, RouteAnalysisResponse
from app.services.node_matching_service import NodeMatchingService
from app.services.route_cost_service import (
    RouteCostStrategy,
    WalkModeConfig,
)
from app.services.route_statistics_service import RouteStatisticsService


class GraphAnalysisProvider(AnalysisProvider):
    def __init__(
        self,
        *,
        graph_data: GraphData,
        heat_provider: HeatCostProvider,
        heat_repository: HeatCostRepository,
        shortest_route_provider: ShortestRouteProvider,
        pawsafe_route_provider: ShortestRouteProvider,
        node_matching: NodeMatchingService,
        statistics: RouteStatisticsService,
        cost_strategy: RouteCostStrategy,
        walk_modes: WalkModeConfig,
        shortest_route_source: str,
        pawsafe_route_source: str,
    ) -> None:
        self._graph_data = graph_data
        self._heat_provider = heat_provider
        self._heat_repository = heat_repository
        self._shortest_route_provider = shortest_route_provider
        self._pawsafe_route_provider = pawsafe_route_provider
        self._node_matching = node_matching
        self._statistics = statistics
        self._cost_strategy = cost_strategy
        self._walk_modes = walk_modes
        self._shortest_route_source = shortest_route_source
        self._pawsafe_route_source = pawsafe_route_source

    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        origin = self._node_matching.match(request.origin)
        destination = self._node_matching.match(request.destination)
        snapshot = self._heat_provider.get_snapshot(request.departure_at)
        warnings = [*snapshot.warnings]
        warnings.extend(self._heat_repository.validate_graph_edges(self._graph_data, snapshot))

        shortest_path = await self._shortest_route_provider.find_route(
            origin.node.node_id,
            destination.node.node_id,
            lambda edge: edge.distance_m,
        )
        profile = self._walk_modes.modes[request.walk_mode]

        def pawsafe_weight(edge: object) -> float | None:
            from app.repositories.graph_repository import EdgeRecord

            if not isinstance(edge, EdgeRecord):
                return None
            heat = self._heat_repository.resolve(edge, snapshot)
            return None if heat is None else self._cost_strategy.calculate(edge, heat, profile)

        pawsafe_path = await self._pawsafe_route_provider.find_route(
            origin.node.node_id,
            destination.node.node_id,
            pawsafe_weight,
        )
        shortest = self._statistics.summarize(
            shortest_path,
            snapshot,
            label="일반 경로",
            route_source=self._shortest_route_source,
            route_kind="shortest",
        )
        pawsafe = self._statistics.summarize(
            pawsafe_path,
            snapshot,
            label="온:길 경로",
            route_source=self._pawsafe_route_source,
            route_kind="pawsafe",
        )
        comparison = self._statistics.compare(shortest, pawsafe)
        if comparison.heat_cost_delta >= 0:
            warnings.append(
                WarningMessage(
                    code="NO_HEAT_IMPROVEMENT",
                    message="선택한 조건에서는 Heat Cost가 더 낮은 대체 경로가 없습니다.",
                )
            )
        digest_payload = (
            f"{request.departure_at.isoformat()}|{request.walk_mode}|"
            f"{','.join(edge.edge_id for edge in pawsafe_path.edges)}"
        )
        digest = hashlib.sha256(digest_payload.encode("utf-8")).hexdigest()[:12]
        statuses = {
            record.validation_status
            for edge in pawsafe_path.edges
            if (record := self._heat_repository.resolve(edge, snapshot)) is not None
        }
        validation_status = "validated" if statuses == {"validated"} else "not_validated"
        return RouteAnalysisResponse(
            analysis_id=f"analysis_{digest}",
            analysis_source="graph",
            validation_status=validation_status,
            requested_departure_at=request.departure_at,
            generated_at=datetime.now(UTC),
            data_valid_at=snapshot.valid_at,
            graph_version=self._graph_data.version,
            heat_data_version=snapshot.data_version,
            weight_profile=WeightProfileResponse(
                id=profile.id,
            ),
            warnings=warnings,
            shortest=shortest,
            pawsafe=pawsafe,
            comparison=comparison,
            heat_segments=self._statistics.segments(pawsafe_path, snapshot),
        )
