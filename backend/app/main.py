from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1 import coverage, meta, places, route_analyses, weather
from app.container import AppContainer, build_container
from app.core.config import Settings, get_settings
from app.core.exception_handlers import install_exception_handlers
from app.core.logging import AccessLogMiddleware, configure_logging
from app.core.request_id import RequestIdMiddleware
from app.providers.analysis.pawsafe_12day import missing_model_assets
from app.schemas.capability import HealthResponse


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    configure_logging(resolved_settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        container = build_container(resolved_settings)
        app.state.container = container
        try:
            yield
        finally:
            await container.close()

    application = FastAPI(
        title=resolved_settings.app_name,
        version="0.1.0",
        description=(
            "PawSafe 앱용 상대 Heat Cost 경로 비교 API. "
            "절대 노면온도 예측이나 안전 판정 API가 아닙니다."
        ),
        lifespan=lifespan,
        debug=False,
    )
    application.add_middleware(GZipMiddleware, minimum_size=1_000)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.allowed_origins_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    application.add_middleware(AccessLogMiddleware)
    application.add_middleware(RequestIdMiddleware)
    install_exception_handlers(application)

    @application.get("/health", response_model=HealthResponse, tags=["health"])
    async def health(request: Request) -> HealthResponse:
        container: AppContainer = request.app.state.container
        uses_12day_model = container.settings.analysis_provider == "pawsafe_12day"
        model_config_path = container.settings.resolve_path(
            container.settings.pawsafe_12day_config_path
        )
        model_assets_ready = not missing_model_assets(model_config_path)
        graph_loaded = model_assets_ready if uses_12day_model else container.graph_data is not None
        heat_loaded = (
            model_assets_ready
            if uses_12day_model
            else container.heat_provider is not None and container.heat_provider.loaded
        )
        place_ready = container.settings.place_provider == "mock" or (
            container.settings.place_provider == "kakao"
            and bool(container.settings.kakao_rest_api_key)
        )
        analysis_ready = (
            container.settings.analysis_provider == "mock"
            or (
                container.settings.analysis_provider == "kakao_walk"
                and bool(container.settings.kakao_rest_api_key)
            )
            or (
                container.settings.analysis_provider == "external"
                and bool(container.settings.analysis_external_url)
            )
            or (
                container.settings.analysis_provider == "graph"
                and graph_loaded
                and heat_loaded
                and container.walk_modes is not None
                and container.shortest_route_provider is not None
            )
            or (
                uses_12day_model
                and model_assets_ready
                and bool(container.settings.asos_service_key)
            )
        )
        return HealthResponse(
            status="ok" if analysis_ready and place_ready else "degraded",
            graph_loaded=graph_loaded,
            heat_data_loaded=heat_loaded,
            analysis_provider=(
                f"{container.settings.analysis_provider}+kakao_fast"
                if container.settings.analysis_provider
                in {
                    "graph",
                    "external",
                }
                and bool(container.settings.kakao_rest_api_key)
                else container.settings.analysis_provider
            ),
            heat_cost_provider=container.settings.heat_cost_provider,
            place_provider=container.settings.place_provider,
            graph_version=(
                "pawsafe-summer-09-21-12day-v5-edges-3797"
                if uses_12day_model and model_assets_ready
                else container.graph_data.version
                if container.graph_data
                else None
            ),
            heat_data_version=(
                (
                    "pawsafe-summer-09-21-12day-v5+asos-fixed-20260815-1600"
                    if container.settings.pawsafe_asos_inference_mode == "fixed"
                    else "pawsafe-summer-09-21-12day-v5+asos-latest"
                )
                if uses_12day_model and model_assets_ready
                else container.heat_provider.data_version
                if container.heat_provider
                else None
            ),
        )

    api_router = APIRouter(prefix=resolved_settings.api_prefix)
    api_router.include_router(meta.router)
    api_router.include_router(coverage.router)
    api_router.include_router(places.router)
    api_router.include_router(route_analyses.router)
    api_router.include_router(weather.router)
    application.include_router(api_router)
    return application


app = create_app()
