from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from app.schemas.geojson import PolygonGeometry


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    graph_loaded: bool
    heat_data_loaded: bool
    analysis_provider: str
    heat_cost_provider: str
    place_provider: str
    graph_version: str | None
    heat_data_version: str | None


class CapabilityResponse(BaseModel):
    analysis_mode: Literal["demo", "graph", "external", "kakao_walk"]
    place_search: Literal["mock", "kakao"]
    map_graph: Literal["demo", "configured", "not_ready"]
    data_pipeline: Literal["not_ready", "configured"]
    heat_model: Literal["not_ready"] = "not_ready"
    heat_cost_source: str
    route_optimizer: str
    absolute_surface_temperature_prediction: Literal[False] = False
    absolute_safety_classification: Literal[False] = False


class CoverageResponse(BaseModel):
    coverage_id: str
    name: str
    is_demo: bool
    geometry: PolygonGeometry
