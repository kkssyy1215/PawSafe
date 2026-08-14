from __future__ import annotations

import httpx

from app.core.config import Settings
from app.core.errors import PipelineNotReadyError
from app.providers.shortest_route.base import ShortestRouteProvider
from app.providers.shortest_route.external_route import ExternalShortestRouteProvider
from app.providers.shortest_route.internal_graph import InternalGraphShortestRouteProvider
from app.repositories.graph_repository import GraphData


def create_shortest_route_provider(
    settings: Settings,
    graph_data: GraphData,
    client: httpx.AsyncClient,
) -> ShortestRouteProvider:
    if settings.shortest_route_provider == "internal_graph":
        return InternalGraphShortestRouteProvider(graph_data)
    if not settings.shortest_route_external_url:
        raise PipelineNotReadyError("shortest_route_external_url")
    return ExternalShortestRouteProvider(
        graph_data,
        client,
        settings.shortest_route_external_url,
        timeout_seconds=settings.request_timeout_seconds,
    )
