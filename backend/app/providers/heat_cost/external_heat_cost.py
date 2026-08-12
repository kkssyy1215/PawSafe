from __future__ import annotations

from datetime import datetime

import httpx

from app.core.errors import (
    ExternalApiError,
    ExternalApiTimeoutError,
    InvalidResponseError,
    NetworkError,
)
from app.providers.heat_cost.base import HeatCostSnapshot


class ExternalHeatCostProvider:
    def __init__(self, client: httpx.Client, url: str, *, timeout_seconds: float) -> None:
        self._client = client
        self._url = url
        self._timeout = timeout_seconds
        self.loaded = True
        self.data_version: str | None = None

    def get_snapshot(self, departure_at: datetime) -> HeatCostSnapshot:
        try:
            response = self._client.get(
                self._url,
                params={"departure_at": departure_at.isoformat()},
                timeout=self._timeout,
            )
            response.raise_for_status()
            snapshot = HeatCostSnapshot.model_validate(response.json())
            self.data_version = snapshot.data_version
            return snapshot
        except httpx.TimeoutException as exc:
            raise ExternalApiTimeoutError() from exc
        except httpx.ConnectError as exc:
            raise NetworkError() from exc
        except httpx.HTTPError as exc:
            raise ExternalApiError() from exc
        except ValueError as exc:
            raise InvalidResponseError() from exc
