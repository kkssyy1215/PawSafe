from __future__ import annotations

from datetime import datetime
from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import ValidationStatus, WarningMessage


class EdgeHeatRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    edge_id: str
    from_node: str
    to_node: str
    valid_at: datetime | None
    heat_cost: float = Field(ge=0, le=100)
    shade_ratio: float | None = Field(default=None, ge=0, le=1)
    direct_sun_minutes: float | None = Field(default=None, ge=0)
    surface_type: str = "unknown"
    confidence: float | None = Field(default=None, ge=0, le=1)
    validation_status: ValidationStatus = "unknown"
    data_version: str | None = None

    @field_validator("valid_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("valid_at must include a timezone offset")
        return value


class HeatCostSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    records: dict[str, EdgeHeatRecord]
    valid_at: datetime | None
    data_version: str | None
    source: str
    is_demo: bool
    warnings: list[WarningMessage] = Field(default_factory=list)


class HeatCostProvider(Protocol):
    loaded: bool
    data_version: str | None

    def get_snapshot(self, departure_at: datetime) -> HeatCostSnapshot: ...


MissingHeatPolicy = Literal["exclude", "conservative", "regional_median"]
