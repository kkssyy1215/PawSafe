from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import httpx

from app.core.config import Settings
from app.core.errors import AppError
from app.providers.analysis.base import AnalysisProvider
from app.providers.analysis.factory import create_analysis_provider
from app.providers.heat_cost.base import HeatCostProvider
from app.providers.heat_cost.factory import create_heat_cost_provider
from app.providers.places.base import PlaceSearchProvider
from app.providers.places.factory import create_place_provider
from app.providers.shortest_route.base import ShortestRouteProvider
from app.providers.shortest_route.factory import create_shortest_route_provider
from app.providers.weather.asos_weather import AsosWeatherProvider
from app.providers.weather.kma_weather import KmaWeatherProvider
from app.repositories.coverage_repository import CoverageData, CoverageRepository
from app.repositories.graph_repository import GraphData, GraphRepository
from app.services.coverage_service import CoverageService
from app.services.place_service import PlaceService
from app.services.route_analysis_service import RouteAnalysisService
from app.services.route_cost_service import WalkModeConfig, load_walk_mode_config


@dataclass
class AppContainer:
    settings: Settings
    async_client: httpx.AsyncClient
    sync_client: httpx.Client
    coverage_data: CoverageData
    graph_data: GraphData | None
    heat_provider: HeatCostProvider | None
    shortest_route_provider: ShortestRouteProvider | None
    walk_modes: WalkModeConfig | None
    place_provider: PlaceSearchProvider
    analysis_provider: AnalysisProvider
    place_service: PlaceService
    route_analysis_service: RouteAnalysisService
    weather_provider: KmaWeatherProvider | None
    asos_weather_provider: AsosWeatherProvider | None

    async def close(self) -> None:
        await self.async_client.aclose()
        self.sync_client.close()


def build_container(settings: Settings) -> AppContainer:
    async_client = httpx.AsyncClient(
        timeout=settings.request_timeout_seconds,
        follow_redirects=False,
    )
    sync_client = httpx.Client(
        timeout=settings.request_timeout_seconds,
        follow_redirects=False,
    )
    coverage_path = settings.resolve_path(
        settings.coverage_file_path or Path("app/fixtures/demo_coverage.geojson")
    )
    coverage_data = CoverageRepository().load(coverage_path)
    coverage_service = CoverageService(coverage_data)

    graph_data: GraphData | None = None
    heat_provider: HeatCostProvider | None = None
    shortest_provider: ShortestRouteProvider | None = None
    walk_modes: WalkModeConfig | None = None
    readiness_error: AppError | None = None
    try:
        graph_path = settings.pipeline_graph_file_path or settings.graph_file_path
        heat_path = settings.pipeline_heat_cost_file_path or settings.heat_cost_file_path
        graph_data = GraphRepository().load(settings.resolve_path(graph_path))
        walk_mode_path = (
            settings.pipeline_walk_mode_config_path
            if settings.pipeline_graph_file_path
            else settings.walk_mode_config_path
        )
        walk_modes = load_walk_mode_config(settings.resolve_path(walk_mode_path))
        heat_provider = create_heat_cost_provider(
            settings,
            sync_client,
            path_override=settings.resolve_path(heat_path),
            data_version_override=settings.pipeline_data_version,
            timezone_name=settings.pipeline_timezone,
        )
        shortest_provider = create_shortest_route_provider(settings, graph_data, async_client)
    except AppError as exc:
        readiness_error = exc

    place_provider = create_place_provider(settings, async_client)
    weather_provider = (
        KmaWeatherProvider(
            async_client,
            settings.kma_service_key,
            base_url=settings.kma_base_url,
            grid_x=settings.kma_grid_x,
            grid_y=settings.kma_grid_y,
            timeout_seconds=settings.request_timeout_seconds,
        )
        if settings.kma_service_key
        else None
    )
    asos_weather_provider = (
        AsosWeatherProvider(
            async_client,
            settings.asos_service_key,
            base_url=settings.asos_base_url,
            station_id=settings.asos_station_id,
            timeout_seconds=settings.request_timeout_seconds,
        )
        if settings.asos_service_key
        else None
    )
    place_service = PlaceService(place_provider, coverage_service)
    analysis_provider = create_analysis_provider(
        settings,
        client=async_client,
        graph_data=graph_data,
        heat_provider=heat_provider,
        shortest_route_provider=shortest_provider,
        walk_modes=walk_modes,
        readiness_error=readiness_error,
    )
    route_analysis_service = RouteAnalysisService(
        analysis_provider,
        coverage_service,
        min_location_distance_m=settings.min_location_distance_m,
        max_route_search_distance_m=settings.max_route_search_distance_m,
        timeout_seconds=settings.request_timeout_seconds,
    )
    return AppContainer(
        settings=settings,
        async_client=async_client,
        sync_client=sync_client,
        coverage_data=coverage_data,
        graph_data=graph_data,
        heat_provider=heat_provider,
        shortest_route_provider=shortest_provider,
        walk_modes=walk_modes,
        place_provider=place_provider,
        analysis_provider=analysis_provider,
        place_service=place_service,
        route_analysis_service=route_analysis_service,
        weather_provider=weather_provider,
        asos_weather_provider=asos_weather_provider,
    )
