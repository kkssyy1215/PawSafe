from __future__ import annotations

from typing import cast

from fastapi import Request

from app.core.config import Settings
from app.services.place_service import PlaceService
from app.services.route_analysis_service import RouteAnalysisService


def get_settings_from_request(request: Request) -> Settings:
    return cast(Settings, request.app.state.container.settings)


def get_place_service(request: Request) -> PlaceService:
    return cast(PlaceService, request.app.state.container.place_service)


def get_route_analysis_service(request: Request) -> RouteAnalysisService:
    return cast(RouteAnalysisService, request.app.state.container.route_analysis_service)
