from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_route_analysis_service
from app.schemas.error import STANDARD_ERROR_RESPONSES
from app.schemas.route import RouteAnalysisRequest, RouteAnalysisResponse
from app.services.route_analysis_service import RouteAnalysisService

router = APIRouter(prefix="/route-analyses", tags=["route analyses"])


@router.post(
    "",
    response_model=RouteAnalysisResponse,
    status_code=status.HTTP_200_OK,
    responses=STANDARD_ERROR_RESPONSES,
)
async def analyze_route(
    payload: RouteAnalysisRequest,
    service: Annotated[RouteAnalysisService, Depends(get_route_analysis_service)],
) -> RouteAnalysisResponse:
    return await service.analyze(payload)
