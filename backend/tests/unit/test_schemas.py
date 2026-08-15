from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.location import LocationInput
from app.schemas.route import RouteAnalysisRequest


def _request(departure_at: str = "2026-08-12T18:30:00+09:00") -> dict[str, object]:
    location = {
        "id": "place",
        "name": "장소",
        "address": "서울특별시 마포구",
        "lat": 37.55,
        "lng": 126.91,
    }
    return {
        "origin": location,
        "destination": {**location, "id": "destination", "lng": 126.90},
        "departure_at": departure_at,
        "walk_mode": "cool",
    }


def test_route_request_requires_timezone() -> None:
    with pytest.raises(ValidationError):
        RouteAnalysisRequest.model_validate(_request("2026-08-12T18:30:00"))


@pytest.mark.parametrize("walk_mode", ["fast", "cool"])
def test_route_request_accepts_walk_modes(walk_mode: str) -> None:
    payload = _request()
    payload["walk_mode"] = walk_mode
    assert RouteAnalysisRequest.model_validate(payload).walk_mode == walk_mode


def test_route_request_rejects_balanced_walk_mode() -> None:
    payload = _request()
    payload["walk_mode"] = "balanced"

    with pytest.raises(ValidationError):
        RouteAnalysisRequest.model_validate(payload)


def test_location_rejects_blank_and_out_of_range() -> None:
    with pytest.raises(ValidationError):
        LocationInput(id="x", name=" ", address="a", lat=91, lng=0)


def test_location_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        LocationInput.model_validate(
            {"id": "x", "name": "x", "address": "x", "lat": 37.5, "lng": 127, "secret": "x"}
        )
