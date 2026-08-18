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
            "id": "place_001",
            "name": "위례광장로 185",
            "address": "서울특별시 송파구 위례광장로 185",
            "lat": 37.4811743,
            "lng": 127.1405973,
        },
        "destination": {
            "id": "place_002",
            "name": "장지동 900-2",
            "address": "서울특별시 송파구 장지동 900-2",
            "lat": 37.4772949,
            "lng": 127.1410705,
        },
        "departure_at": "2026-08-19T12:00:00+09:00",
        "walk_mode": "cool",
    }
