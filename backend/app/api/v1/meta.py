from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas.capability import CapabilityResponse

router = APIRouter(tags=["meta"])


@router.get("/capabilities", response_model=CapabilityResponse)
async def capabilities(request: Request) -> CapabilityResponse:
    container = request.app.state.container
    settings = container.settings
    analysis_mode = "demo" if settings.analysis_provider == "mock" else settings.analysis_provider
    return CapabilityResponse(
        analysis_mode=analysis_mode,
        place_search=settings.place_provider,
        map_graph=(
            "demo"
            if container.graph_data is not None and container.graph_data.is_demo
            else "configured"
            if container.graph_data is not None
            else "not_ready"
        ),
        data_pipeline=(
            "configured"
            if settings.analysis_provider not in {"mock", "kakao_walk"}
            and container.heat_provider is not None
            else "not_ready"
        ),
        heat_cost_source=(
            "mock_fixture" if settings.heat_cost_provider == "mock" else settings.heat_cost_provider
        ),
        route_optimizer=(
            "mock_fixture"
            if settings.analysis_provider == "mock"
            else "kakao_walk"
            if settings.analysis_provider == "kakao_walk"
            else settings.shortest_route_provider
        ),
    )
