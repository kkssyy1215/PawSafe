from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def settings() -> Settings:
    return Settings(app_env="test", log_level="WARNING", _env_file=None)


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings), raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture
def route_payload() -> dict[str, object]:
    return {
        "origin": {
            "id": "place_home",
            "name": "우리집",
            "address": "서울특별시 마포구 독막로",
            "lat": 37.55,
            "lng": 126.91,
        },
        "destination": {
            "id": "place_001",
            "name": "망원한강공원",
            "address": "서울특별시 마포구 마포나루길",
            "lat": 37.555,
            "lng": 126.9,
        },
        "departure_at": "2026-08-12T18:30:00+09:00",
        "walk_mode": "cool",
    }
