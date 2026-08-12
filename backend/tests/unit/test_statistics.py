from __future__ import annotations

from app.schemas.geojson import LineStringGeometry
from app.schemas.route import RouteSummary
from app.services.route_statistics_service import RouteStatisticsService


def _summary(
    *,
    distance: int,
    duration: int,
    heat: float,
    shade: float | None,
    sun: float | None,
    coordinates: list[tuple[float, float]] | None = None,
) -> RouteSummary:
    return RouteSummary(
        route_id="route",
        label="route",
        route_source="test",
        geometry=LineStringGeometry(coordinates=coordinates or [(126.9, 37.5), (126.91, 37.51)]),
        distance_m=distance,
        duration_min=duration,
        heat_cost=heat,
        shade_ratio=shade,
        direct_sun_minutes=sun,
        edge_count=1,
    )


def test_comparison_math() -> None:
    shortest = _summary(distance=1200, duration=17, heat=72, shade=0.21, sun=13)
    pawsafe = _summary(
        distance=1400,
        duration=20,
        heat=41,
        shade=0.59,
        sun=4,
        coordinates=[(126.9, 37.5), (126.92, 37.52)],
    )
    comparison = RouteStatisticsService.compare(shortest, pawsafe)
    assert comparison.distance_delta_m == 200
    assert comparison.duration_delta_min == 3
    assert comparison.heat_cost_delta == -31
    assert comparison.heat_reduction_percent == 43.1
    assert comparison.shade_ratio_delta_percentage_point == 38
    assert comparison.direct_sun_minutes_delta == -9
    assert not comparison.same_route


def test_comparison_handles_zero_and_nulls() -> None:
    shortest = _summary(distance=1, duration=1, heat=0, shade=None, sun=None)
    comparison = RouteStatisticsService.compare(shortest, shortest)
    assert comparison.same_route
    assert comparison.heat_reduction_percent is None
    assert comparison.shade_ratio_delta_percentage_point is None
    assert comparison.direct_sun_minutes_delta is None
