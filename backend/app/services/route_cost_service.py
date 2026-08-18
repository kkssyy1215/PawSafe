from __future__ import annotations

from pathlib import Path
from typing import Protocol

import yaml
from pydantic import BaseModel, ConfigDict, Field

from app.core.errors import InvalidDataFileError
from app.providers.heat_cost.base import EdgeHeatRecord
from app.repositories.graph_repository import EdgeRecord
from app.schemas.common import WalkMode


class WalkModeProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    alpha: float = Field(ge=0, le=1)
    beta: float = Field(ge=0, le=1)


class WalkModeConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: str
    modes: dict[WalkMode, WalkModeProfile]


def load_walk_mode_config(path: Path) -> WalkModeConfig:
    try:
        payload = yaml.safe_load(path.read_text(encoding="utf-8"))
        config = WalkModeConfig.model_validate(payload)
        if set(config.modes) != {"fast", "cool"}:
            raise ValueError("all walk modes are required")
        for profile in config.modes.values():
            if abs(profile.alpha + profile.beta - 1.0) > 1e-9:
                raise ValueError("alpha and beta must sum to 1")
        return config
    except Exception as exc:
        raise InvalidDataFileError("walk_mode_config") from exc


class RouteCostStrategy(Protocol):
    def calculate(
        self,
        edge: EdgeRecord,
        heat: EdgeHeatRecord,
        profile: WalkModeProfile,
    ) -> float: ...


class WeightedHeatRouteCostStrategy:
    def calculate(
        self,
        edge: EdgeRecord,
        heat: EdgeHeatRecord,
        profile: WalkModeProfile,
    ) -> float:
        heat_ratio = heat.heat_cost / 100
        heat_exposure_cost = edge.distance_m * heat_ratio
        return profile.alpha * edge.distance_m + profile.beta * heat_exposure_cost
