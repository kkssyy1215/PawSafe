from __future__ import annotations

import httpx

from app.core.errors import (
    ExternalApiError,
    ExternalApiTimeoutError,
    InvalidResponseError,
    NetworkError,
)
from app.schemas.route import RouteAnalysisRequest, RouteAnalysisResponse


class ExternalAnalysisProvider:
    def __init__(
        self,
        client: httpx.AsyncClient,
        url: str,
        *,
        timeout_seconds: float,
    ) -> None:
        self._client = client
        self._url = url
        self._timeout = timeout_seconds

    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        try:
            response = await self._client.post(
                self._url,
                json=request.model_dump(mode="json"),
                timeout=self._timeout,
            )
            response.raise_for_status()
            return RouteAnalysisResponse.model_validate(response.json())
        except httpx.TimeoutException as exc:
            raise ExternalApiTimeoutError() from exc
        except httpx.ConnectError as exc:
            raise NetworkError() from exc
        except httpx.HTTPError as exc:
            raise ExternalApiError() from exc
        except ValueError as exc:
            raise InvalidResponseError() from exc
