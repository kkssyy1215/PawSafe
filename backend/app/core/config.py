from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: Literal["development", "test", "staging", "production"] = "development"
    app_name: str = "PawSafe API"
    api_prefix: str = "/v1"

    analysis_provider: Literal["mock", "graph", "external", "kakao_walk", "pawsafe_12day"] = "mock"
    heat_cost_provider: Literal["mock", "file", "external"] = "mock"
    place_provider: Literal["mock", "kakao"] = "mock"
    shortest_route_provider: Literal["internal_graph", "external"] = "internal_graph"

    graph_file_path: Path = Path("app/fixtures/demo_graph.geojson")
    heat_cost_file_path: Path = Path("app/fixtures/demo_heat_cost.json")
    # Data-team exports are intentionally configured as absolute/private paths.
    # They are never copied into this repository or bundled into the API image.
    pipeline_graph_file_path: Path | None = None
    pipeline_heat_cost_file_path: Path | None = None
    pipeline_walk_mode_config_path: Path = Path("app/config_data/walk_modes.pipeline.yaml")
    pipeline_data_version: str | None = None
    pipeline_timezone: str = "Asia/Seoul"
    coverage_file_path: Path | None = None
    walk_mode_config_path: Path = Path("app/config_data/walk_modes.demo.yaml")
    mock_scenarios_file_path: Path = Path("app/fixtures/demo_scenarios.json")
    mock_places_file_path: Path = Path("app/fixtures/demo_places.json")

    analysis_external_url: str | None = None
    pawsafe_12day_config_path: Path = Path("data/models/pawsafe_12day/config.json")
    heat_cost_external_url: str | None = None
    shortest_route_external_url: str | None = None
    kakao_rest_api_key: str | None = None
    kma_service_key: str | None = None
    kma_base_url: str = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0"
    kma_grid_x: int = Field(default=62, gt=0)
    kma_grid_y: int = Field(default=126, gt=0)
    asos_service_key: str | None = None
    asos_base_url: str = "https://apis.data.go.kr/1360000/AsosHourlyInfoService"
    asos_station_id: int = Field(default=108, gt=0)
    pawsafe_asos_inference_mode: Literal["latest", "fixed"] = "latest"
    pawsafe_asos_fixed_timestamp: str = "2026-08-15T16:00:00"

    allowed_origins: str = (
        "http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006"
    )
    request_timeout_seconds: float = Field(default=10.0, gt=0)
    route_analysis_timeout_seconds: float = Field(default=60.0, gt=0)
    place_search_timeout_seconds: float = Field(default=5.0, gt=0)

    walking_speed_m_per_minute: float = Field(default=70.0, gt=0)
    min_location_distance_m: float = Field(default=10.0, ge=0)
    max_node_match_distance_m: float = Field(default=150.0, gt=0)
    max_route_search_distance_m: float = Field(default=10_000.0, gt=0)
    max_heat_data_age_minutes: float = Field(default=120.0, gt=0)
    heat_missing_policy: Literal["exclude", "conservative", "regional_median"] = "exclude"
    conservative_missing_heat_cost: float = Field(default=100.0, ge=0, le=100)

    log_level: str = "INFO"
    log_precise_locations: bool = False

    @field_validator(
        "coverage_file_path",
        "analysis_external_url",
        "heat_cost_external_url",
        "shortest_route_external_url",
        "kakao_rest_api_key",
        "pipeline_graph_file_path",
        "pipeline_heat_cost_file_path",
        "pipeline_data_version",
        "kma_service_key",
        "asos_service_key",
        mode="before",
    )
    @classmethod
    def empty_string_to_none(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("api_prefix")
    @classmethod
    def validate_api_prefix(cls, value: str) -> str:
        normalized = value.rstrip("/")
        if not normalized.startswith("/"):
            raise ValueError("API_PREFIX must start with '/'")
        return normalized

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def project_root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    def resolve_path(self, value: Path) -> Path:
        return value if value.is_absolute() else self.project_root / value


@lru_cache
def get_settings() -> Settings:
    return Settings()
