from __future__ import annotations

import pytest

from app.core.errors import OutOfCoverageError
from app.repositories.coverage_repository import CoverageRepository
from app.schemas.location import CoordinateInput
from app.services.coverage_service import CoverageService
from app.services.node_matching_service import haversine_m


def test_haversine_is_zero_for_same_point() -> None:
    assert haversine_m(37.55, 126.91, 37.55, 126.91) == 0


def test_coverage_includes_boundary_and_rejects_outside(settings: object) -> None:
    path = settings.resolve_path(settings.coverage_file_path)  # type: ignore[attr-defined]
    service = CoverageService(CoverageRepository().load(path))
    assert service.contains(CoordinateInput(lat=37.4811743, lng=127.1405973))
    with pytest.raises(OutOfCoverageError):
        service.require_contains(CoordinateInput(lat=38, lng=127))
