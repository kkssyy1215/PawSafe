from __future__ import annotations

import math
from dataclasses import dataclass

from shapely import box

from app.core.errors import NoWalkableNodeError
from app.core.geo import haversine_m
from app.repositories.graph_repository import GraphData, NodeRecord
from app.schemas.location import CoordinateInput


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
