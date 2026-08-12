from __future__ import annotations

from app.core.privacy import sanitize_for_log


def test_privacy_sanitizer_redacts_addresses_coordinates_and_secrets() -> None:
    original = {
        "address": "서울특별시 마포구 독막로",
        "lat": 37.55001234,
        "lng": 126.91001234,
        "api_key": "super-secret",
        "walk_mode": "cool",
    }
    sanitized = sanitize_for_log(original)
    rendered = str(sanitized)
    assert "독막로" not in rendered
    assert "37.55001234" not in rendered
    assert "126.91001234" not in rendered
    assert "super-secret" not in rendered
    assert sanitized["walk_mode"] == "cool"


def test_coarse_logging_is_opt_in() -> None:
    sanitized = sanitize_for_log({"lat": 37.55001234}, include_coarse_location=True)
    assert sanitized["lat"] == 37.55
