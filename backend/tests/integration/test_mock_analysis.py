from __future__ import annotations

from copy import deepcopy

import pytest
from fastapi.testclient import TestClient


def test_mock_cool_analysis_matches_expo_contract(
    client: TestClient,
    route_payload: dict[str, object],
) -> None:
    response = client.post("/v1/route-analyses", json=route_payload)
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["is_demo"] is True
    assert payload["analysis_source"] == "mock_fixture"
    assert payload["validation_status"] == "not_validated"
    assert payload["requested_departure_at"] == "2026-08-12T18:30:00+09:00"
    assert payload["data_valid_at"] is None
    assert payload["heat_data_version"] is None
    assert payload["shortest"]["heat_cost"] == 72
    assert payload["pawsafe"]["heat_cost"] == 41
    assert payload["comparison"]["heat_reduction_percent"] == 43.1
    assert payload["heat_segments"][0]["validation_status"] == "not_validated"
    lng, lat = payload["pawsafe"]["geometry"]["coordinates"][0]
    assert (lng, lat) == (126.91, 37.55)


@pytest.mark.parametrize(
    ("walk_mode", "distance"),
    [("fast", 1200), ("balanced", 1300), ("cool", 1400)],
)
def test_all_walk_mode_scenarios(
    client: TestClient,
    route_payload: dict[str, object],
    walk_mode: str,
    distance: int,
) -> None:
    payload = deepcopy(route_payload)
    payload["walk_mode"] = walk_mode
    response = client.post("/v1/route-analyses", json=payload)
    assert response.status_code == 200
    assert response.json()["pawsafe"]["distance_m"] == distance


@pytest.mark.parametrize(
    ("scenario_id", "expected_same", "warning_code"),
    [
        ("scenario_same_route", True, "SAME_ROUTE"),
        ("scenario_no_improvement", False, "NO_HEAT_IMPROVEMENT"),
    ],
)
def test_deterministic_special_scenarios(
    client: TestClient,
    route_payload: dict[str, object],
    scenario_id: str,
    expected_same: bool,
    warning_code: str,
) -> None:
    payload = deepcopy(route_payload)
    destination = dict(payload["destination"])  # type: ignore[arg-type]
    destination["id"] = scenario_id
    payload["destination"] = destination
    response = client.post("/v1/route-analyses", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["comparison"]["same_route"] is expected_same
    assert result["warnings"][0]["code"] == warning_code
    if scenario_id == "scenario_no_improvement":
        assert result["comparison"]["heat_cost_delta"] >= 0


@pytest.mark.parametrize(
    ("scenario_id", "status_code", "code"),
    [
        ("scenario_no_route", 422, "NO_ROUTE"),
        ("scenario_timeout", 504, "ANALYSIS_TIMEOUT"),
    ],
)
def test_mock_error_scenarios(
    client: TestClient,
    route_payload: dict[str, object],
    scenario_id: str,
    status_code: int,
    code: str,
) -> None:
    payload = deepcopy(route_payload)
    destination = dict(payload["destination"])  # type: ignore[arg-type]
    destination["id"] = scenario_id
    payload["destination"] = destination
    response = client.post(
        "/v1/route-analyses",
        json=payload,
        headers={"X-Request-ID": "req_test_123"},
    )
    assert response.status_code == status_code
    assert response.json()["error"] == {
        "code": code,
        "message": response.json()["error"]["message"],
        "retryable": code == "ANALYSIS_TIMEOUT",
        "details": {},
        "request_id": "req_test_123",
    }


def test_out_of_coverage(client: TestClient, route_payload: dict[str, object]) -> None:
    payload = deepcopy(route_payload)
    destination = dict(payload["destination"])  # type: ignore[arg-type]
    destination.update({"lat": 38.0, "lng": 127.0})
    payload["destination"] = destination
    response = client.post("/v1/route-analyses", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "OUT_OF_COVERAGE"


def test_same_location(client: TestClient, route_payload: dict[str, object]) -> None:
    payload = deepcopy(route_payload)
    payload["destination"] = {**dict(payload["origin"]), "id": "another"}  # type: ignore[arg-type]
    response = client.post("/v1/route-analyses", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "SAME_LOCATION"


def test_validation_error_is_sanitized(
    client: TestClient,
    route_payload: dict[str, object],
) -> None:
    payload = deepcopy(route_payload)
    payload["departure_at"] = "2026-08-12T18:30:00"
    response = client.post("/v1/route-analyses", json=payload)
    rendered = response.text
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "독막로" not in rendered
    assert "37.55" not in rendered
