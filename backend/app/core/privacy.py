from __future__ import annotations

from collections.abc import Mapping
from typing import Any

_PRIVATE_KEYS = {"address", "origin", "destination", "query", "q"}
_COORDINATE_KEYS = {"lat", "lng", "latitude", "longitude"}
_SECRET_MARKERS = {"api_key", "authorization", "token", "secret", "password"}


def sanitize_for_log(value: Any, *, include_coarse_location: bool = False) -> Any:
    """Return a logging-safe copy; application code never logs request bodies directly."""
    if isinstance(value, Mapping):
        sanitized: dict[str, Any] = {}
        for raw_key, item in value.items():
            key = str(raw_key)
            lowered = key.lower()
            if lowered in _PRIVATE_KEYS or any(marker in lowered for marker in _SECRET_MARKERS):
                sanitized[key] = "[REDACTED]"
            elif lowered in _COORDINATE_KEYS:
                sanitized[key] = (
                    round(float(item), 2)
                    if include_coarse_location and item is not None
                    else "[REDACTED]"
                )
            else:
                sanitized[key] = sanitize_for_log(
                    item,
                    include_coarse_location=include_coarse_location,
                )
        return sanitized
    if isinstance(value, (list, tuple)):
        return [
            sanitize_for_log(item, include_coarse_location=include_coarse_location)
            for item in value
        ]
    return value
