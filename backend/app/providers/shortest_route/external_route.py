from __future__ import annotations

import httpx
from pydantic import BaseModel, ConfigDict

from app.core.errors import (
    ExternalApiError,
    ExternalApiTimeoutError,
    InvalidResponseError,
    NetworkError,
    NoRouteError,
)
from app.providers.shortest_route.base import EdgeWeight, RoutePath
from app.repositories.graph_repository import GraphData


class ExternalRoutePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    edge_ids: list[str]


class ExternalShortestRouteProvider:
    def __init__(
        self,
        graph_data: GraphData,
        client: httpx.AsyncClient,
        url: str,
        *,
        timeout_seconds: float,
    ) -> None:
        self._graph_data = graph_data
        self._client = client
        self._url = url
        self._timeout = timeout_seconds

    async def find_route(
        self,
        origin_node_id: str,
        destination_node_id: str,
        weight: EdgeWeight,
    ) -> RoutePath:
        del weight
        try:
            response = await self._client.post(
                self._url,
                json={"origin_node_id": origin_node_id, "destination_node_id": destination_node_id},
                timeout=self._timeout,
            )
            response.raise_for_status()
            payload = ExternalRoutePayload.model_validate(response.json())
            edges = [self._graph_data.edges[edge_id] for edge_id in payload.edge_ids]
        except httpx.TimeoutException as exc:
            raise ExternalApiTimeoutError() from exc
        except httpx.ConnectError as exc:
            raise NetworkError() from exc
        except httpx.HTTPError as exc:
            raise ExternalApiError() from exc
        except (ValueError, KeyError) as exc:
            raise InvalidResponseError() from exc
        if not edges:
            raise NoRouteError()
        nodes = [edges[0].from_node, *(edge.to_node for edge in edges)]
        return RoutePath(node_ids=nodes, edges=edges)
