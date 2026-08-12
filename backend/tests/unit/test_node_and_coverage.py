from __future__ import annotations

import pytest

from app.core.errors import NoWalkableNodeError, OutOfCoverageError
from app.repositories.coverage_repository import CoverageRepository
from app.repositories.graph_repository import GraphRepository
from app.schemas.location import CoordinateInput
from app.services.coverage_service import CoverageService
from app.services.node_matching_service import NodeMatchingService, haversine_m


def test_haversine_is_zero_for_same_point() -> None:
    assert haversine_m(37.55, 126.91, 37.55, 126.91) == 0


def test_node_matching_and_distance_limit(settings: object) -> None:
    path = settings.resolve_path(settings.graph_file_path)  # type: ignore[attr-defined]
    graph = GraphRepository().load(path)
    matcher = NodeMatchingService(graph, max_distance_m=150)
    assert matcher.match(CoordinateInput(lat=37.55, lng=126.91)).node.node_id == "n1"
    with pytest.raises(NoWalkableNodeError):
        matcher.match(CoordinateInput(lat=37.56, lng=126.915))


def test_coverage_includes_boundary_and_rejects_outside(settings: object) -> None:
    path = settings.resolve_path(settings.graph_file_path.parent / "demo_coverage.geojson")  # type: ignore[attr-defined]
    service = CoverageService(CoverageRepository().load(path))
    assert service.contains(CoordinateInput(lat=37.54, lng=126.89))
    with pytest.raises(OutOfCoverageError):
        service.require_contains(CoordinateInput(lat=38, lng=127))
