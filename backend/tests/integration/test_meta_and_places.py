from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_reports_final_gmm_runtime(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "graph_loaded": True,
        "heat_data_loaded": True,
        "analysis_provider": "ongil_gmm",
        "heat_cost_provider": "file",
        "place_provider": "catalog",
        "graph_version": "ongil-gmm-0815-1600-v1-edges-3797",
        "heat_data_version": "ongil-gmm-0815-1600-v1-snapshot-20260815-1600",
    }
    assert response.headers["X-Request-ID"].startswith("req_")


def test_capabilities_reports_gmm_and_dijkstra(client: TestClient) -> None:
    payload = client.get("/v1/capabilities").json()
    assert payload["analysis_mode"] == "ongil_gmm"
    assert payload["heat_model"] == "ongil_gmm"
    assert payload["heat_cost_source"] == "gmm_snapshot_20260815_1600"
    assert payload["route_optimizer"] == "dijkstra_length_and_relative_heat"
    assert payload["absolute_safety_classification"] is False


def test_coverage_is_songpa_geojson(client: TestClient) -> None:
    payload = client.get("/v1/coverage").json()
    assert payload["coverage_id"] == "songpa-live-v1"
    assert payload["geometry"]["type"] == "Polygon"
    lng, lat = payload["geometry"]["coordinates"][0][0]
    assert 127.0 < lng < 127.2
    assert 37.4 < lat < 37.6
    assert "is_demo" not in payload


def test_catalog_place_search_returns_unique_supported_address(client: TestClient) -> None:
    response = client.get("/v1/places/search", params={"q": "위례광장로 185"})
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == "place_001"
    assert items[0]["lat"] == 37.4811743
    assert items[0]["lng"] == 127.1405973
    assert items[0]["is_in_coverage"] is True


def test_catalog_search_can_sort_by_location_hint(client: TestClient) -> None:
    response = client.get(
        "/v1/places/search",
        params={"q": "장지동", "lat": 37.4773, "lng": 127.1410},
    )
    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == "place_002"


def test_place_search_requires_lat_and_lng_together(client: TestClient) -> None:
    response = client.get(
        "/v1/places/search",
        params={"q": "위례", "lat": 37.48},
        headers={"X-Request-ID": "req_place_hint"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert response.json()["error"]["request_id"] == "req_place_hint"


def test_reverse_geocode_recomputes_coverage(client: TestClient) -> None:
    inside = client.post(
        "/v1/places/reverse-geocode",
        json={"lat": 37.4811743, "lng": 127.1405973},
    )
    outside = client.post("/v1/places/reverse-geocode", json={"lat": 38.0, "lng": 127.0})
    assert inside.status_code == outside.status_code == 200
    assert inside.json()["is_in_coverage"] is True
    assert outside.json()["is_in_coverage"] is False


def test_openapi_contains_route_safety_payload(client: TestClient) -> None:
    document = client.get("/openapi.json").json()
    assert "/v1/route-analyses" in document["paths"]
    assert "RouteSafetyPayload" in document["components"]["schemas"]
    assert "/v1/places/search" in document["paths"]
