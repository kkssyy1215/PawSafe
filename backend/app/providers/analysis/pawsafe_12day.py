from __future__ import annotations

import asyncio
import hashlib
import threading
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast
from zoneinfo import ZoneInfo

import geopandas as gpd
import networkx as nx
import pandas as pd
from shapely.geometry import Point

from app.core.errors import (
    AppError,
    ExternalApiError,
    InvalidDataFileError,
    ModelNotReadyError,
    NoRouteError,
)
from app.model_runtime.pawsafe_12day.asos_live import fetch_asos_inference_window
from app.model_runtime.pawsafe_12day.forecast import build_forecast_features
from app.model_runtime.pawsafe_12day.inference import (
    load_model_bundle,
    score_features,
)
from app.model_runtime.pawsafe_12day.preprocess import load_weather
from app.model_runtime.pawsafe_12day.routing import build_graph, route
from app.model_runtime.pawsafe_12day.utils import load_config
from app.schemas.common import WarningMessage, WeightProfileResponse
from app.schemas.geojson import LineStringGeometry
from app.schemas.route import (
    HeatSegment,
    RouteAnalysisRequest,
    RouteAnalysisResponse,
    RouteSummary,
)
from app.services.route_statistics_service import RouteStatisticsService

SEOUL = ZoneInfo("Asia/Seoul")
MODEL_VERSION = "pawsafe-summer-09-21-12day-v5"
REQUIRED_MODEL_PATHS = (
    Path("data/raw/asos_hourly.csv"),
    Path("data/processed/edges_static.gpkg"),
    Path("data/processed/shadow_cache_songpa_full_network_v3.parquet"),
    Path("outputs/heat_cluster_model.joblib"),
)
WeatherFetcher = Callable[..., tuple[pd.DataFrame, pd.Timestamp]]


def missing_model_assets(config_path: Path) -> list[Path]:
    root = config_path.parent
    candidates = (config_path, *(root / relative for relative in REQUIRED_MODEL_PATHS))
    return [path for path in candidates if not path.is_file()]


@dataclass(frozen=True)
class _RuntimeAssets:
    config: dict[str, Any]
    edges: gpd.GeoDataFrame
    baseline: pd.DataFrame
    historical_features: pd.DataFrame
    model: dict[str, Any]
    graph: nx.MultiGraph


class Pawsafe12DayAnalysisProvider:
    """Run the supplied schema-v5 model with a complete ASOS history window."""

    def __init__(
        self,
        *,
        config_path: Path,
        asos_service_key: str,
        asos_base_url: str,
        asos_station_id: int,
        asos_inference_mode: str,
        asos_fixed_timestamp: str,
        walking_speed_m_per_minute: float,
        weather_fetcher: WeatherFetcher = fetch_asos_inference_window,
    ) -> None:
        self._config_path = config_path
        self._asos_service_key = asos_service_key
        self._asos_base_url = asos_base_url
        self._asos_station_id = asos_station_id
        self._asos_inference_mode = asos_inference_mode
        self._asos_fixed_timestamp = asos_fixed_timestamp
        self._walking_speed = walking_speed_m_per_minute
        self._weather_fetcher = weather_fetcher
        self._assets: _RuntimeAssets | None = None
        self._asset_lock = threading.Lock()

    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        try:
            return await asyncio.to_thread(self._analyze_sync, request)
        except AppError:
            raise
        except (nx.NetworkXNoPath, nx.NodeNotFound) as exc:
            raise NoRouteError() from exc
        except (FileNotFoundError, KeyError, ValueError) as exc:
            raise InvalidDataFileError("pawsafe_12day") from exc
        except RuntimeError as exc:
            if "ASOS" in str(exc) or "ASOS_SERVICE_KEY" in str(exc):
                raise ExternalApiError() from exc
            raise ModelNotReadyError() from exc
        except Exception as exc:
            raise ModelNotReadyError() from exc

    def _load_assets(self) -> _RuntimeAssets:
        if self._assets is not None:
            return self._assets
        with self._asset_lock:
            if self._assets is not None:
                return self._assets
            missing = missing_model_assets(self._config_path)
            if missing:
                raise FileNotFoundError(", ".join(str(path) for path in missing))

            config = load_config(self._config_path)
            root = self._config_path.parent
            edges = gpd.read_file(
                root / "data/processed/edges_static.gpkg",
                layer="edges",
            ).to_crs(config["project_crs"])
            baseline = load_weather(config)
            historical_features = pd.read_parquet(
                root / "data/processed/shadow_cache_songpa_full_network_v3.parquet",
                columns=["edge_id", "timestamp", "shade_ratio"],
            )
            model = load_model_bundle(root / "outputs/heat_cluster_model.joblib")
            self._validate_assets(edges, model)
            graph, _ = build_graph(edges, config)
            if graph.number_of_nodes() == 0:
                raise ValueError("모델 보행 그래프에 노드가 없습니다.")
            self._assets = _RuntimeAssets(
                config=config,
                edges=edges,
                baseline=baseline,
                historical_features=historical_features,
                model=model,
                graph=graph,
            )
            return self._assets

    def _analyze_sync(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        assets = self._load_assets()
        weather, _ = self._weather_fetcher(
            service_key=self._asos_service_key,
            station_id=self._asos_station_id,
            base_url=self._asos_base_url,
            mode=self._asos_inference_mode,
            fixed_timestamp=self._asos_fixed_timestamp,
            history_hours=int(assets.config["time"].get("inference_history_hours", 12)),
            service_start_hour=int(assets.config["time"].get("service_start_hour", 9)),
            service_end_hour=int(assets.config["time"].get("service_end_hour", 21)),
        )
        weather = self._normalize_weather(weather)
        requested = weather["timestamp"].max()

        current_features, matched = build_forecast_features(
            edges=assets.edges,
            buildings=None,
            trees=None,
            forecast=weather,
            baseline=assets.baseline,
            target_timestamp=requested,
            cfg=assets.config,
            historical_features=assets.historical_features,
        )
        target_features = current_features.loc[current_features["timestamp"].eq(matched)].copy()
        if target_features.empty:
            raise RuntimeError("현재 ASOS 관측 시각의 Edge Feature가 없습니다.")

        scored = score_features(target_features, assets.model)
        heat_by_edge = dict(zip(scored["edge_id"], scored["heat_cost"], strict=True))
        feature_by_edge = scored.drop_duplicates("edge_id").set_index("edge_id")

        points = gpd.GeoSeries(
            [
                Point(request.origin.lng, request.origin.lat),
                Point(request.destination.lng, request.destination.lat),
            ],
            crs=4326,
        ).to_crs(assets.config["project_crs"])
        start_xy = points.iloc[0].coords[0]
        end_xy = points.iloc[1].coords[0]

        shortest_result = route(assets.graph, start_xy, end_xy, heat_by_edge, 0.0)
        cool_result = route(assets.graph, start_xy, end_xy, heat_by_edge, 0.95)
        data_valid_at = self._as_seoul_datetime(matched)
        shortest = self._summarize_route(
            shortest_result,
            feature_by_edge,
            assets.config["project_crs"],
            label="일반 최단경로",
            route_kind="shortest",
        )
        pawsafe = self._summarize_route(
            cool_result,
            feature_by_edge,
            assets.config["project_crs"],
            label="PawSafe 추천",
            route_kind="pawsafe",
        )
        comparison = RouteStatisticsService.compare(shortest, pawsafe)
        warnings = [
            WarningMessage(
                code="RELATIVE_HEAT_COST",
                message="Heat Cost는 상대 열노출 지표이며 노면온도(℃)나 안전 판정값이 아닙니다.",
            ),
            WarningMessage(
                code=(
                    "ASOS_FIXED_DEMO_OBSERVATION"
                    if self._asos_inference_mode == "fixed"
                    else "ASOS_LATEST_OBSERVATION"
                ),
                message=(
                    "ASOS 서울 108번의 2026-08-15 16:00 고정 관측과 직전 12시간을 사용했습니다."
                    if self._asos_inference_mode == "fixed"
                    else "ASOS 서울 108번의 최신 유효 관측과 직전 12시간을 사용했습니다."
                ),
            ),
        ]
        if comparison.heat_cost_delta >= 0:
            warnings.append(
                WarningMessage(
                    code="NO_HEAT_IMPROVEMENT",
                    message="현재 조건에서는 Heat Cost가 더 낮은 대체 경로가 없습니다.",
                )
            )

        digest_payload = (
            f"{matched}|{','.join(str(edge_id) for edge_id in cool_result['edge_ids'])}"
        )
        digest = hashlib.sha256(digest_payload.encode("utf-8")).hexdigest()[:12]
        return RouteAnalysisResponse(
            analysis_id=f"analysis_{digest}",
            is_demo=False,
            analysis_source=(
                "pawsafe_summer_09_21_12day_v5_asos_fixed"
                if self._asos_inference_mode == "fixed"
                else "pawsafe_summer_09_21_12day_v5_asos_latest"
            ),
            validation_status="not_validated",
            requested_departure_at=request.departure_at,
            generated_at=datetime.now(UTC),
            data_valid_at=data_valid_at,
            graph_version=f"{MODEL_VERSION}-edges-{len(assets.edges)}",
            heat_data_version=(
                f"{MODEL_VERSION}-asos-{self._asos_station_id}-{matched:%Y%m%d%H%M}"
            ),
            weight_profile=WeightProfileResponse(
                id="pawsafe_summer_09_21_cool_0.95",
                is_demo=False,
            ),
            warnings=warnings,
            shortest=shortest,
            pawsafe=pawsafe,
            comparison=comparison,
            heat_segments=self._segments(
                cool_result,
                feature_by_edge,
                assets.config["project_crs"],
                data_valid_at,
            ),
        )

    @staticmethod
    def _normalize_weather(weather: pd.DataFrame) -> pd.DataFrame:
        if "timestamp" not in weather:
            raise RuntimeError("ASOS 기상자료에 timestamp 열이 없습니다.")
        result = weather.copy()
        timestamps = pd.to_datetime(result["timestamp"], errors="coerce")
        if getattr(timestamps.dt, "tz", None) is not None:
            timestamps = timestamps.dt.tz_convert(SEOUL).dt.tz_localize(None)
        result["timestamp"] = timestamps
        result = result.dropna(subset=["timestamp"]).sort_values("timestamp")
        if result.empty:
            raise RuntimeError("유효한 ASOS 관측자료가 없습니다.")
        return result.reset_index(drop=True)

    @staticmethod
    def _validate_assets(edges: gpd.GeoDataFrame, model: dict[str, Any]) -> None:
        if model.get("schema_version") != 5:
            raise ValueError("여름 09~21시 schema v5 모델이 아닙니다.")
        expected_count = int(model.get("edge_count", -1))
        if expected_count != len(edges):
            raise ValueError(f"학습 모델과 Edge 수가 다릅니다: {expected_count} != {len(edges)}")
        fingerprint = hashlib.sha256(
            "|".join(
                f"{edge_id}:{float(length_m):.3f}"
                for edge_id, length_m in zip(edges["edge_id"], edges["length_m"], strict=True)
            ).encode("utf-8")
        ).hexdigest()
        if fingerprint != model.get("edge_fingerprint"):
            raise ValueError("학습 모델과 현재 Edge fingerprint가 다릅니다.")

    def _summarize_route(
        self,
        result: dict[str, Any],
        features: pd.DataFrame,
        source_crs: str,
        *,
        label: str,
        route_kind: str,
    ) -> RouteSummary:
        segments = result["segments"]
        total_distance = float(sum(float(segment["length_m"]) for segment in segments))
        if total_distance <= 0 or result["geometry"] is None:
            raise NoRouteError()
        heat_cost = (
            sum(float(segment["length_m"]) * float(segment["heat_cost"]) for segment in segments)
            / total_distance
        )
        shade_ratio = self._weighted_feature(segments, features, "shade_ratio")
        duration_min = max(1, round(total_distance / self._walking_speed))
        direct_sun = duration_min * (1 - shade_ratio) if shade_ratio is not None else None
        edge_ids = [str(edge_id) for edge_id in result["edge_ids"]]
        digest = hashlib.sha256("|".join(edge_ids).encode("utf-8")).hexdigest()[:10]
        return RouteSummary(
            route_id=f"{route_kind}_{digest}",
            label=label,
            route_source="pawsafe_12day_graph",
            geometry=self._line_geometry(result["geometry"], source_crs),
            distance_m=round(total_distance),
            duration_min=duration_min,
            heat_cost=round(heat_cost, 1),
            shade_ratio=round(shade_ratio, 3) if shade_ratio is not None else None,
            direct_sun_minutes=round(direct_sun, 1) if direct_sun is not None else None,
            edge_count=len(segments),
        )

    def _segments(
        self,
        result: dict[str, Any],
        features: pd.DataFrame,
        source_crs: str,
        data_valid_at: datetime,
    ) -> list[HeatSegment]:
        output: list[HeatSegment] = []
        for order, segment in enumerate(result["segments"], start=1):
            edge_id = str(segment["edge_id"])
            feature = features.loc[edge_id] if edge_id in features.index else None
            heat_cost = round(float(segment["heat_cost"]), 1)
            shade_ratio = self._feature_number(feature, "shade_ratio")
            direct_sun = self._feature_number(feature, "recent_direct_sun_minutes")
            surface_type = (
                str(feature.get("surface_code", "unknown")) if feature is not None else "unknown"
            )
            output.append(
                HeatSegment(
                    edge_id=edge_id,
                    display_name=f"산책로 구간 {order}",
                    level="low" if heat_cost < 40 else "medium" if heat_cost < 70 else "high",
                    heat_cost=heat_cost,
                    shade_ratio=round(shade_ratio, 3) if shade_ratio is not None else None,
                    direct_sun_minutes=round(direct_sun, 1) if direct_sun is not None else None,
                    surface_type=surface_type,
                    confidence=None,
                    data_valid_at=data_valid_at,
                    validation_status="not_validated",
                    geometry=self._line_geometry(segment["geometry"], source_crs),
                )
            )
        return output

    @staticmethod
    def _weighted_feature(
        segments: list[dict[str, Any]],
        features: pd.DataFrame,
        column: str,
    ) -> float | None:
        values: list[tuple[float, float]] = []
        for segment in segments:
            edge_id = str(segment["edge_id"])
            if edge_id not in features.index:
                continue
            value = Pawsafe12DayAnalysisProvider._feature_number(features.loc[edge_id], column)
            if value is not None:
                values.append((float(segment["length_m"]), value))
        total = sum(distance for distance, _ in values)
        return sum(distance * value for distance, value in values) / total if total else None

    @staticmethod
    def _feature_number(feature: Any, column: str) -> float | None:
        if feature is None:
            return None
        value = feature.get(column)
        return None if value is None or pd.isna(value) else float(value)

    @staticmethod
    def _line_geometry(geometry: Any, source_crs: str) -> LineStringGeometry:
        transformed = gpd.GeoSeries([geometry], crs=source_crs).to_crs(4326).iloc[0]
        coordinates = [
            (round(float(lng), 6), round(float(lat), 6)) for lng, lat in transformed.coords
        ]
        return LineStringGeometry(coordinates=coordinates)

    @staticmethod
    def _as_seoul_datetime(timestamp: pd.Timestamp) -> datetime:
        value = pd.Timestamp(timestamp)
        value = value.tz_localize(SEOUL) if value.tzinfo is None else value.tz_convert(SEOUL)
        return cast(datetime, value.to_pydatetime())
