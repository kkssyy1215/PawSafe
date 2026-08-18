from __future__ import annotations

from datetime import datetime
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import ValidationStatus, WalkMode, WarningMessage, WeightProfileResponse
from app.schemas.geojson import LineStringGeometry
from app.schemas.location import LocationInput


class RouteAnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    origin: LocationInput
    destination: LocationInput
    departure_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Asia/Seoul")),
        description="생략하면 요청 시점의 한국 표준시를 사용합니다.",
    )
    walk_mode: WalkMode

    @field_validator("departure_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("departure_at must include a timezone offset")
        return value


class RouteSafetyThresholds(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comfortable_max: int = Field(ge=1, le=100)
    caution_min: int = Field(ge=1, le=100)
    caution_max: int = Field(ge=1, le=100)
    warning_min: int = Field(ge=1, le=100)


class RouteSafetyPayload(BaseModel):
    """Post-route 1-100 heat-risk score supplied by the final GMM model."""

    model_config = ConfigDict(extra="forbid")

    route_id: str
    target_time_kst: datetime
    score: int = Field(ge=1, le=100)
    score_raw_0_100: float = Field(ge=0, le=100)
    unit_heat_cost_0_to_alpha: float = Field(ge=0)
    route_distance_m: float = Field(gt=0)
    air_temperature_c: float
    temperature_factor_0_1: float = Field(ge=0, le=1)
    weighted_mean_p_high: float = Field(ge=0, le=1)
    high_heat_cluster_raw: int
    alert_alpha: float = Field(gt=0)
    status: Literal["comfortable", "caution", "danger"]
    color: Literal["green", "yellow", "red"]
    should_warn: bool
    message: str
    thresholds: RouteSafetyThresholds
    calibrated_safety_threshold: bool
    method_note: str


class RouteSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    route_id: str
    label: str
    route_source: str
    navigation_url: str | None = None
    geometry: LineStringGeometry
    distance_m: int
    duration_min: int
    heat_cost: float
    shade_ratio: float | None = Field(default=None, ge=0, le=1)
    direct_sun_minutes: float | None = Field(default=None, ge=0)
    edge_count: int = Field(ge=0)
    safety: RouteSafetyPayload | None = None


class RouteComparison(BaseModel):
    model_config = ConfigDict(extra="forbid")

    same_route: bool
    distance_delta_m: int
    duration_delta_min: int
    heat_cost_delta: float
    heat_reduction_percent: float | None
    shade_ratio_delta_percentage_point: float | None
    direct_sun_minutes_delta: float | None


class HeatSegment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    edge_id: str
    display_name: str
    level: Literal["low", "medium", "high", "unknown"]
    heat_cost: float | None = Field(default=None, ge=0, le=100)
    shade_ratio: float | None = Field(default=None, ge=0, le=1)
    direct_sun_minutes: float | None = Field(default=None, ge=0)
    surface_type: str
    confidence: float | None = Field(default=None, ge=0, le=1)
    data_valid_at: datetime | None
    validation_status: ValidationStatus
    geometry: LineStringGeometry


class RouteAnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    analysis_id: str
    status: Literal["completed"] = "completed"
    analysis_source: str
    validation_status: ValidationStatus
    requested_departure_at: datetime
    generated_at: datetime
    data_valid_at: datetime | None
    graph_version: str
    heat_data_version: str | None
    weight_profile: WeightProfileResponse
    warnings: list[WarningMessage]
    shortest: RouteSummary
    pawsafe: RouteSummary
    comparison: RouteComparison
    heat_segments: list[HeatSegment]
