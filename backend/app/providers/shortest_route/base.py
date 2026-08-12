from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from app.repositories.graph_repository import EdgeRecord

EdgeWeight = Callable[[EdgeRecord], float | None]


@dataclass(frozen=True)
class RoutePath:
    node_ids: list[str]
    edges: list[EdgeRecord]


class ShortestRouteProvider(Protocol):
    async def find_route(
        self,
        origin_node_id: str,
        destination_node_id: str,
        weight: EdgeWeight,
    ) -> RoutePath: ...
