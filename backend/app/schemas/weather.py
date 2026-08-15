from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CurrentWeatherResponse(BaseModel):
    observed_at: datetime
    temperature_c: float | None = None
    humidity_pct: float | None = None
    wind_speed_ms: float | None = None
    rainfall_mm: float | None = None
    grid_x: int
    grid_y: int
    source: str = "KMA_ULTRA_SHORT_NOWCAST"


class AsosHourlyResponse(BaseModel):
    observed_at: datetime
    station_id: int
    station_name: str | None = None
    temperature_c: float | None = None
    humidity_pct: float | None = None
    wind_speed_ms: float | None = None
    rainfall_mm: float | None = None
    solar_radiation_mj_m2: float | None = None
    sunshine_hours: float | None = None
    source: str = "KMA_ASOS_HOURLY_PREVIOUS_DAY_REFERENCE"
