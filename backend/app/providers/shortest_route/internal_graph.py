from __future__ import annotations

import math
from itertools import pairwise

import networkx as nx

from app.core.errors import NoRouteError
from app.providers.shortest_route.base import EdgeWeight, RoutePath
from app.repositories.graph_repository import EdgeRecord, GraphData


class InternalGraphShortestRouteProvider:
    def __init__(self, graph_data: GraphData) -> None:
        self._graph_data = graph_data

    async def find_route(
        self,
        origin_node_id: str,
        destination_node_id: str,
        weight: EdgeWeight,
    ) -> RoutePath:
        projected = nx.DiGraph()
        selected_edges: dict[tuple[str, str], EdgeRecord] = {}
        for edge in self._graph_data.edges.values():
            value = weight(edge)
            if value is None or not math.isfinite(value) or value < 0:
                continue
            key = (edge.from_node, edge.to_node)
            previous = selected_edges.get(key)
            if previous is None or value < projected.edges[key]["weight"]:
                selected_edges[key] = edge
                projected.add_edge(edge.from_node, edge.to_node, weight=value)
        try:
            node_ids = nx.shortest_path(
                projected,
                source=origin_node_id,
                target=destination_node_id,
                weight="weight",
                method="dijkstra",
            )
        except (nx.NetworkXNoPath, nx.NodeNotFound) as exc:
            raise NoRouteError() from exc
        if len(node_ids) < 2:
            raise NoRouteError()
        edges = [selected_edges[(start, end)] for start, end in pairwise(node_ids)]
        if not edges:
            raise NoRouteError()
        return RoutePath(node_ids=node_ids, edges=edges)
