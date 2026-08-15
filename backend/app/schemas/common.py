from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


class WarningMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str


class WeightProfileResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    is_demo: bool


WalkMode = Literal["fast", "cool"]
ValidationStatus = Literal["not_validated", "validated", "partially_validated", "unknown"]
