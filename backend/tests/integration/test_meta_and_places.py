from __future__ import annotations

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "graph_loaded": True,
        "heat_data_loaded": True,
        "analysis_provider": "mock",
        "heat_cost_provider": "mock",
        "place_provider": "mock",
        "graph_version": "demo-graph-v1",
        "heat_data_version": None,
    }
    assert response.headers["X-Request-ID"].startswith("req_")


def test_capabilities_maps_mock_to_demo(client: TestClient) -> None:
    response = client.get("/v1/capabilities")
    assert response.status_code == 200
    payload = response.json()
    assert payload["analysis_mode"] == "demo"
    assert payload["heat_model"] == "not_ready"
    assert payload["absolute_safety_classification"] is False


def test_coverage_is_geojson_lng_lat(client: TestClient) -> None:
    payload = client.get("/v1/coverage").json()
    assert payload["coverage_id"] == "demo-mapo-v1"
    assert payload["geometry"]["type"] == "Polygon"
    lng, lat = payload["geometry"]["coordinates"][0][0]
    assert lng == 126.89
    assert lat == 37.54


def test_place_search_contract(client: TestClient) -> None:
    response = client.get("/v1/places/search", params={"q": "망원"})
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"items"}
    assert payload["items"]
    assert all("is_in_coverage" in item for item in payload["items"])


def test_reverse_geocode_recomputes_coverage(client: TestClient) -> None:
    inside = client.post("/v1/places/reverse-geocode", json={"lat": 37.55, "lng": 126.91})
    outside = client.post("/v1/places/reverse-geocode", json={"lat": 38.0, "lng": 127.0})
    assert inside.status_code == outside.status_code == 200
    assert inside.json()["is_in_coverage"] is True
    assert outside.json()["is_in_coverage"] is False


def test_openapi_is_generated(client: TestClient) -> None:
    document = client.get("/openapi.json").json()
    assert "/v1/route-analyses" in document["paths"]
    assert "/v1/places/search" in document["paths"]
    error_schema = document["paths"]["/v1/route-analyses"]["post"]["responses"]["422"]
    assert error_schema["content"]["application/json"]["schema"]["$ref"].endswith("/ErrorResponse")
