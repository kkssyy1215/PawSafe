from __future__ import annotations

from fastapi import APIRouter, Request

from app.container import AppContainer
from app.schemas.capability import CoverageResponse

router = APIRouter(tags=["coverage"])


@router.get("/coverage", response_model=CoverageResponse)
async def get_coverage(request: Request) -> CoverageResponse:
    container: AppContainer = request.app.state.container
    return container.coverage_data.response
