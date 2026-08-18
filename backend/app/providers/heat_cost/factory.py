from __future__ import annotations

from pathlib import Path

import httpx

from app.core.config import Settings
from app.core.errors import PipelineNotReadyError
from app.providers.heat_cost.base import HeatCostProvider
from app.providers.heat_cost.external_heat_cost import ExternalHeatCostProvider
from app.providers.heat_cost.file_heat_cost import FileHeatCostProvider


def create_heat_cost_provider(
    settings: Settings,
    sync_client: httpx.Client,
    *,
    path_override: Path | None = None,
    data_version_override: str | None = None,
    timezone_name: str = "Asia/Seoul",
) -> HeatCostProvider:
    if settings.heat_cost_provider == "file":
        return FileHeatCostProvider(
            path_override or settings.resolve_path(settings.heat_cost_file_path),
            max_age_minutes=settings.max_heat_data_age_minutes,
            data_version_override=data_version_override,
            timezone_name=timezone_name,
        )
    if not settings.heat_cost_external_url:
        raise PipelineNotReadyError("heat_cost_external_url")
    return ExternalHeatCostProvider(
        sync_client,
        settings.heat_cost_external_url,
        timeout_seconds=settings.request_timeout_seconds,
    )
