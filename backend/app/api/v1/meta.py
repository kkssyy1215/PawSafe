from __future__ import annotations

from fastapi import APIRouter, Request

from app.providers.analysis.ongil_gmm import missing_model_assets
from app.schemas.capability import CapabilityResponse

router = APIRouter(tags=["meta"])


@router.get("/capabilities", response_model=CapabilityResponse)
async def capabilities(request: Request) -> CapabilityResponse:
    container = request.app.state.container
    settings = container.settings
    uses_gmm_model = settings.analysis_provider == "ongil_gmm"
    model_assets_ready = not missing_model_assets(
        settings.resolve_path(settings.ongil_gmm_model_path)
    )
    return CapabilityResponse(
        analysis_mode=settings.analysis_provider,
        place_search=settings.place_provider,
        map_graph=(
            "configured"
            if uses_gmm_model and model_assets_ready
            else "configured"
            if container.graph_data is not None
            else "not_ready"
        ),
        data_pipeline=(
            "configured"
            if uses_gmm_model and model_assets_ready
            else "configured"
            if settings.analysis_provider != "ongil_gmm" and container.heat_provider is not None
            else "not_ready"
        ),
        heat_model="ongil_gmm" if uses_gmm_model and model_assets_ready else "not_ready",
        heat_cost_source=(
            "gmm_snapshot_20260815_1600" if uses_gmm_model else settings.heat_cost_provider
        ),
        route_optimizer=(
            "dijkstra_length_and_relative_heat"
            if uses_gmm_model
            else settings.shortest_route_provider
        ),
    )
