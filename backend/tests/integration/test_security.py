from __future__ import annotations

import logging
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.logging import configure_logging
from app.main import create_app


@pytest.fixture
def info_app() -> FastAPI:
    application = create_app(Settings(app_env="test", log_level="INFO", _env_file=None))

    @application.get("/_test/unexpected")
    async def unexpected() -> None:
        raise RuntimeError(
            "/Users/private/edge_heat.parquet KAKAO_REST_API_KEY=secret-key "
            "서울특별시 마포구 독막로 37.55001234"
        )

    return application


@pytest.fixture
def info_client(info_app: FastAPI) -> Iterator[TestClient]:
    with TestClient(info_app, raise_server_exceptions=False) as client:
        yield client


def test_unexpected_error_response_hides_internal_details(info_client: TestClient) -> None:
    response = info_client.get("/_test/unexpected", headers={"X-Request-ID": "req_security"})
    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "요청을 처리하지 못했습니다.",
            "retryable": True,
            "details": {},
            "request_id": "req_security",
        }
    }
    assert "/Users/private" not in response.text
    assert "secret-key" not in response.text
    assert "독막로" not in response.text
    assert "37.55001234" not in response.text


def test_access_log_contains_no_query_or_body(
    info_client: TestClient,
    route_payload: dict[str, object],
    capsys: pytest.CaptureFixture[str],
) -> None:
    response = info_client.post("/v1/route-analyses", json=route_payload)
    assert response.status_code == 200
    log_output = capsys.readouterr().out
    assert '"endpoint": "/v1/route-analyses"' in log_output
    assert "독막로" not in log_output
    assert "마포나루길" not in log_output
    assert "37.55" not in log_output
    assert "126.91" not in log_output


def test_external_http_client_info_logs_are_disabled() -> None:
    configure_logging("INFO")

    assert logging.getLogger("httpx").getEffectiveLevel() >= logging.WARNING
    assert logging.getLogger("httpcore").getEffectiveLevel() >= logging.WARNING
