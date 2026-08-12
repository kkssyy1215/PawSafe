from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def graph_client() -> Iterator[TestClient]:
    settings = Settings(
        app_env="test",
        analysis_provider="graph",
        heat_cost_provider="mock",
        log_level="WARNING",
        _env_file=None,
    )
    with TestClient(create_app(settings), raise_server_exceptions=False) as client:
        yield client


@pytest.mark.parametrize(
    ("mode", "expected_distance", "same_route"),
    [("fast", 1200, True), ("balanced", 1300, False), ("cool", 1400, False)],
)
def test_networkx_graph_route_modes(
    graph_client: TestClient,
    route_payload: dict[str, object],
    mode: str,
    expected_distance: int,
    same_route: bool,
) -> None:
    route_payload["walk_mode"] = mode
    response = graph_client.post("/v1/route-analyses", json=route_payload)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["analysis_source"] == "graph"
    assert payload["is_demo"] is True
    assert payload["shortest"]["distance_m"] == 1200
    assert payload["pawsafe"]["distance_m"] == expected_distance
    assert payload["comparison"]["same_route"] is same_route


def test_graph_mode_invalid_file_is_explicit_503(
    route_payload: dict[str, object],
) -> None:
    settings = Settings(
        app_env="test",
        analysis_provider="graph",
        graph_file_path=Path("data/exports/missing.geojson"),
        log_level="WARNING",
        _env_file=None,
    )
    with TestClient(create_app(settings), raise_server_exceptions=False) as client:
        health = client.get("/health")
        response = client.post("/v1/route-analyses", json=route_payload)
    assert health.json()["status"] == "degraded"
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "INVALID_DATA_FILE"
    assert "/Users/" not in response.text
