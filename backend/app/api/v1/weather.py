from __future__ import annotations

from datetime import datetime
from typing import cast

from fastapi import APIRouter, Request

from app.core.errors import PipelineNotReadyError
from app.providers.weather.asos_weather import AsosWeatherProvider
from app.providers.weather.kma_weather import KmaWeatherProvider
from app.schemas.weather import AsosHourlyResponse, CurrentWeatherResponse

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/current", response_model=CurrentWeatherResponse)
async def current_weather(request: Request) -> CurrentWeatherResponse:
    provider = cast(KmaWeatherProvider | None, request.app.state.container.weather_provider)
    if provider is None:
        raise PipelineNotReadyError("kma_weather")
    return await provider.current()


@router.get("/asos/reference", response_model=AsosHourlyResponse)
async def asos_reference_weather(
    request: Request,
    reference_at: datetime | None = None,
) -> AsosHourlyResponse:
    provider = cast(AsosWeatherProvider | None, request.app.state.container.asos_weather_provider)
    if provider is None:
        raise PipelineNotReadyError("asos_weather")
    return await provider.same_hour_previous_day(reference_at)
