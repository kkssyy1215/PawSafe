from __future__ import annotations

import math
from dataclasses import dataclass

from shapely import box

from app.core.errors import NoWalkableNodeError
from app.repositories.graph_repository import GraphData, NodeRecord
from app.schemas.location import CoordinateInput

EARTH_RADIUS_M = 6_371_000.0


def haversine_m(lat_a: float, lng_a: float, lat_b: float, lng_b: float) -> float:
    lat1 = math.radians(lat_a)
    lat2 = math.radians(lat_b)
    delta_lat = math.radians(lat_b - lat_a)
    delta_lng = math.radians(lng_b - lng_a)
    value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    )
    return EARTH_RADIUS_M * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))


@dataclass(frozen=True)
class NodeMatch:
    node: NodeRecord
    distance_m: float


class NodeMatchingService:
    def __init__(self, graph_data: GraphData, *, max_distance_m: float) -> None:
        self._graph_data = graph_data
        self._max_distance_m = max_distance_m

    def match(self, location: CoordinateInput) -> NodeMatch:
        latitude_delta = self._max_distance_m / 111_320
        longitude_scale = max(abs(math.cos(math.radians(location.lat))), 0.01)
        longitude_delta = self._max_distance_m / (111_320 * longitude_scale)
        candidate_indices = self._graph_data.node_index.query(
            box(
                location.lng - longitude_delta,
                location.lat - latitude_delta,
                location.lng + longitude_delta,
                location.lat + latitude_delta,
            )
        )
        candidates = (
            NodeMatch(
                node=node,
                distance_m=haversine_m(location.lat, location.lng, node.lat, node.lng),
            )
            for raw_index in candidate_indices
            if (node := self._graph_data.indexed_nodes[int(raw_index)])
        )
        nearest = min(candidates, key=lambda candidate: candidate.distance_m, default=None)
        if nearest is None or nearest.distance_m > self._max_distance_m:
            raise NoWalkableNodeError()
        return nearest
