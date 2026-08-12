from __future__ import annotations

from app.providers.heat_cost.base import EdgeHeatRecord
from app.repositories.graph_repository import EdgeRecord
from app.schemas.geojson import LineStringGeometry
from app.services.route_cost_service import WalkModeProfile, WeightedHeatRouteCostStrategy


def _edge() -> EdgeRecord:
    return EdgeRecord(
        edge_id="e1",
        heat_edge_id="e1",
        from_node="a",
        to_node="b",
        distance_m=100,
        geometry=LineStringGeometry(coordinates=[(126.9, 37.5), (126.91, 37.51)]),
    )


def _heat() -> EdgeHeatRecord:
    return EdgeHeatRecord(
        edge_id="e1",
        from_node="a",
        to_node="b",
        valid_at=None,
        heat_cost=80,
    )


def test_documented_cost_formula_for_all_modes() -> None:
    strategy = WeightedHeatRouteCostStrategy()
    edge = _edge()
    heat = _heat()
    expected = {"fast": 97, "balanced": 90, "cool": 85}
    weights = {"fast": (0.85, 0.15), "balanced": (0.5, 0.5), "cool": (0.25, 0.75)}
    for mode, (alpha, beta) in weights.items():
        profile = WalkModeProfile(id=mode, alpha=alpha, beta=beta)
        assert strategy.calculate(edge, heat, profile) == expected[mode]
