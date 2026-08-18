from __future__ import annotations

from fastapi import APIRouter, Request

from app.providers.analysis.pawsafe_12day import missing_model_assets
from app.schemas.capability import CapabilityResponse

router = APIRouter(tags=["meta"])


@router.get("/capabilities", response_model=CapabilityResponse)
async def capabilities(request: Request) -> CapabilityResponse:
    container = request.app.state.container
    settings = container.settings
    analysis_mode = "demo" if settings.analysis_provider == "mock" else settings.analysis_provider
    uses_12day_model = settings.analysis_provider == "pawsafe_12day"
    model_assets_ready = not missing_model_assets(
        settings.resolve_path(settings.pawsafe_12day_config_path)
    )
    return CapabilityResponse(
        analysis_mode=analysis_mode,
        place_search=settings.place_provider,
        map_graph=(
            "configured"
            if uses_12day_model and model_assets_ready
            else "demo"
            if container.graph_data is not None and container.graph_data.is_demo
            else "configured"
            if container.graph_data is not None
            else "not_ready"
        ),
        data_pipeline=(
            "configured"
            if uses_12day_model and model_assets_ready
            else "configured"
            if settings.analysis_provider not in {"mock", "kakao_walk"}
            and container.heat_provider is not None
            else "not_ready"
        ),
        heat_model="pawsafe_12day" if uses_12day_model and model_assets_ready else "not_ready",
        heat_cost_source=(
            (
                f"pawsafe_summer_09_21_12day_v5+KMA_ASOS_station_"
                f"{settings.asos_station_id}_{settings.pawsafe_asos_inference_mode}"
            )
            if uses_12day_model
            else "mock_fixture"
            if settings.heat_cost_provider == "mock"
            else settings.heat_cost_provider
        ),
        route_optimizer=(
            "mock_fixture"
            if settings.analysis_provider == "mock"
            else "kakao_walk"
            if settings.analysis_provider == "kakao_walk"
            else "pawsafe_12day"
            if uses_12day_model
            else "kakao_walk+internal_graph"
            if settings.analysis_provider == "graph" and settings.kakao_rest_api_key
            else settings.shortest_route_provider
        ),
    )
