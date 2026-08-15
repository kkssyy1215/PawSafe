from __future__ import annotations

import math

EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat_a: float, lng_a: float, lat_b: float, lng_b: float) -> float:
    """Return the great-circle distance between two WGS84 coordinates in metres."""
    lat1 = math.radians(lat_a)
    lat2 = math.radians(lat_b)
    delta_lat = math.radians(lat_b - lat_a)
    delta_lng = math.radians(lng_b - lng_a)
    value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    )
    return EARTH_RADIUS_M * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))
