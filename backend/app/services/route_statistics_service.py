from __future__ import annotations

import hashlib

from app.core.errors import HeatDataNotAvailableError
from app.providers.heat_cost.base import HeatCostSnapshot
from app.providers.shortest_route.base import RoutePath
from app.repositories.heat_cost_repository import HeatCostRepository
from app.schemas.geojson import LineStringGeometry
from app.schemas.route import HeatSegment, RouteComparison, RouteSummary


class RouteStatisticsService:
    def __init__(
        self,
        heat_repository: HeatCostRepository,
        *,
        walking_speed_m_per_minute: float,
    ) -> None:
        self._heat_repository = heat_repository
        self._walking_speed = walking_speed_m_per_minute

    def summarize(
        self,
        path: RoutePath,
        snapshot: HeatCostSnapshot,
        *,
        label: str,
        route_source: str,
        route_kind: str,
    ) -> RouteSummary:
        total_distance = sum(edge.distance_m for edge in path.edges)
        if total_distance <= 0:
            raise ValueError("route distance must be positive")
        heat_pairs = [(edge, self._heat_repository.resolve(edge, snapshot)) for edge in path.edges]
        known_heat = [(edge, heat) for edge, heat in heat_pairs if heat is not None]
        if not known_heat:
            raise HeatDataNotAvailableError()
        heat_cost = sum(edge.distance_m * heat.heat_cost for edge, heat in known_heat) / sum(
            edge.distance_m for edge, _ in known_heat
        )
        shade = [
            (edge.distance_m, heat.shade_ratio)
            for edge, heat in known_heat
            if heat.shade_ratio is not None
        ]
        shade_ratio = (
            sum(distance * value for distance, value in shade)
            / sum(distance for distance, _ in shade)
            if shade
            else None
        )
        direct_values = [
            heat.direct_sun_minutes for _, heat in known_heat if heat.direct_sun_minutes is not None
        ]
        direct_sun = sum(direct_values) if direct_values else None
        digest = hashlib.sha256(
            "|".join(edge.edge_id for edge in path.edges).encode("utf-8")
        ).hexdigest()[:10]
        return RouteSummary(
            route_id=f"{route_kind}_{digest}",
            label=label,
            route_source=route_source,
            geometry=LineStringGeometry(coordinates=self._combine_geometry(path)),
            distance_m=round(total_distance),
            duration_min=max(1, round(total_distance / self._walking_speed)),
            heat_cost=round(heat_cost, 1),
            shade_ratio=round(shade_ratio, 3) if shade_ratio is not None else None,
            direct_sun_minutes=round(direct_sun, 1) if direct_sun is not None else None,
            edge_count=len(path.edges),
        )

    def segments(self, path: RoutePath, snapshot: HeatCostSnapshot) -> list[HeatSegment]:
        segments: list[HeatSegment] = []
        for edge in path.edges:
            heat = self._heat_repository.resolve(edge, snapshot)
            if heat is None:
                segments.append(
                    HeatSegment(
                        edge_id=edge.heat_edge_id,
                        display_name=edge.display_name,
                        level="unknown",
                        heat_cost=None,
                        shade_ratio=None,
                        direct_sun_minutes=None,
                        surface_type="unknown",
                        confidence=None,
                        data_valid_at=snapshot.valid_at,
                        validation_status="unknown",
                        geometry=edge.geometry,
                    )
                )
                continue
            level = "low" if heat.heat_cost < 40 else "medium" if heat.heat_cost < 70 else "high"
            segments.append(
                HeatSegment(
                    edge_id=edge.heat_edge_id,
                    display_name=edge.display_name,
                    level=level,
                    heat_cost=heat.heat_cost,
                    shade_ratio=heat.shade_ratio,
                    direct_sun_minutes=heat.direct_sun_minutes,
                    surface_type=heat.surface_type,
                    confidence=heat.confidence,
                    data_valid_at=heat.valid_at,
                    validation_status=heat.validation_status,
                    geometry=edge.geometry,
                )
            )
        return segments

    @staticmethod
    def compare(shortest: RouteSummary, pawsafe: RouteSummary) -> RouteComparison:
        reduction = (
            round((shortest.heat_cost - pawsafe.heat_cost) / shortest.heat_cost * 100, 1)
            if shortest.heat_cost > 0
            else None
        )
        shade_delta = (
            round((pawsafe.shade_ratio - shortest.shade_ratio) * 100, 1)
            if pawsafe.shade_ratio is not None and shortest.shade_ratio is not None
            else None
        )
        sun_delta = (
            round(pawsafe.direct_sun_minutes - shortest.direct_sun_minutes, 1)
            if pawsafe.direct_sun_minutes is not None and shortest.direct_sun_minutes is not None
            else None
        )
        return RouteComparison(
            same_route=(shortest.geometry.coordinates == pawsafe.geometry.coordinates),
            distance_delta_m=pawsafe.distance_m - shortest.distance_m,
            duration_delta_min=pawsafe.duration_min - shortest.duration_min,
            heat_cost_delta=round(pawsafe.heat_cost - shortest.heat_cost, 1),
            heat_reduction_percent=reduction,
            shade_ratio_delta_percentage_point=shade_delta,
            direct_sun_minutes_delta=sun_delta,
        )

    @staticmethod
    def _combine_geometry(path: RoutePath) -> list[tuple[float, float]]:
        result: list[tuple[float, float]] = []
        for edge in path.edges:
            coordinates = [(round(lng, 6), round(lat, 6)) for lng, lat in edge.geometry.coordinates]
            if result and coordinates and result[-1] == coordinates[0]:
                result.extend(coordinates[1:])
            else:
                result.extend(coordinates)
        return result
