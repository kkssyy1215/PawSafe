from __future__ import annotations

from fastapi.testclient import TestClient


def test_final_gmm_route_response(client: TestClient, route_payload: dict[str, object]) -> None:
    response = client.post("/v1/route-analyses", json=route_payload)
    assert response.status_code == 200
    payload = response.json()

    assert payload["analysis_source"] == "ongil_gmm_0815_1600"
    assert payload["data_valid_at"] == "2026-08-15T16:00:00+09:00"
    assert payload["weight_profile"]["id"] == "length_x_1_plus_heat_penalty_1.0"
    assert payload["shortest"]["distance_m"] == 874
    assert payload["pawsafe"]["distance_m"] == 967
    assert payload["shortest"]["heat_cost"] > payload["pawsafe"]["heat_cost"]
    assert payload["shortest"]["safety"]["score"] == 41
    assert payload["pawsafe"]["safety"]["score"] == 6
    assert payload["shortest"]["safety"]["should_warn"] is False
    assert {segment["heat_cost"] for segment in payload["heat_segments"]} <= {0.0, 1.0, 2.0}
    assert all(0 <= segment["confidence"] <= 1 for segment in payload["heat_segments"])


def test_fast_and_cool_share_the_same_two_final_model_routes(
    client: TestClient,
    route_payload: dict[str, object],
) -> None:
    cool = client.post("/v1/route-analyses", json=route_payload).json()
    fast_request = {**route_payload, "walk_mode": "fast"}
    fast = client.post("/v1/route-analyses", json=fast_request).json()

    assert fast["shortest"] == cool["shortest"]
    assert fast["pawsafe"] == cool["pawsafe"]
