from __future__ import annotations

import asyncio
import hashlib
import json
import math
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from itertools import pairwise
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import geopandas as gpd
import networkx as nx
import numpy as np
import pandas as pd
from shapely.geometry import LineString, Point

from app.core.errors import AppError, InvalidDataFileError, NoRouteError, NoWalkableNodeError
from app.schemas.common import WarningMessage, WeightProfileResponse
from app.schemas.geojson import LineStringGeometry
from app.schemas.route import (
    HeatSegment,
    RouteAnalysisRequest,
    RouteAnalysisResponse,
    RouteSafetyPayload,
    RouteSafetyThresholds,
    RouteSummary,
)
from app.services.route_statistics_service import RouteStatisticsService

MODEL_VERSION = "ongil-gmm-0815-1600-v1"
MODEL_CRS = "EPSG:5186"
TARGET_TIME = datetime(2026, 8, 15, 16, 0, tzinfo=ZoneInfo("Asia/Seoul"))
NODE_SNAP_M = 0.5
HEAT_PENALTY = 1.0
REQUIRED_MODEL_PATHS = (
    Path("runtime/edge_cluster_heatcost.gpkg"),
    Path("runtime/cluster_heatcost_mapping.csv"),
    Path("runtime/route_safety_payload.json"),
)


def missing_model_assets(model_path: Path) -> list[Path]:
    return [
        model_path / relative
        for relative in REQUIRED_MODEL_PATHS
        if not (model_path / relative).is_file()
    ]


@dataclass(frozen=True)
class _RuntimeAssets:
    edges: gpd.GeoDataFrame
    edge_by_id: pd.DataFrame
    graph: nx.MultiGraph
    node_array: np.ndarray
    high_cluster_raw: int
    high_probability_column: str
    air_temperature_c: float
    alert_alpha: float
    temperature_min_c: float
    temperature_max_c: float
    thresholds: RouteSafetyThresholds


class OngilGmmAnalysisProvider:
    """Route over the final 2026-08-15 16:00 three-cluster GMM Edge snapshot."""

    def __init__(
        self,
        *,
        model_path: Path,
        walking_speed_m_per_minute: float,
        max_node_match_distance_m: float,
    ) -> None:
        self._model_path = model_path
        self._walking_speed = walking_speed_m_per_minute
        self._max_node_match_distance_m = max_node_match_distance_m
        self._assets: _RuntimeAssets | None = None
        self._asset_lock = threading.Lock()

    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        try:
            return await asyncio.to_thread(self._analyze_sync, request)
        except AppError:
            raise
        except (nx.NetworkXNoPath, nx.NodeNotFound) as exc:
            raise NoRouteError() from exc
        except (FileNotFoundError, KeyError, TypeError, ValueError) as exc:
            raise InvalidDataFileError("ongil_gmm_0815_1600") from exc

    def _load_assets(self) -> _RuntimeAssets:
        if self._assets is not None:
            return self._assets
        with self._asset_lock:
            if self._assets is not None:
                return self._assets
            missing = missing_model_assets(self._model_path)
            if missing:
                raise FileNotFoundError(", ".join(str(path) for path in missing))

            runtime = self._model_path / "runtime"
            edges = gpd.read_file(runtime / "edge_cluster_heatcost.gpkg", layer="edge_heatcost")
            if edges.crs is None:
                raise ValueError("Edge GPKG 좌표계 정보가 없습니다.")
            edges = edges.to_crs(MODEL_CRS)
            required_columns = {
                "edge_id",
                "heat_cost",
                "cluster_confidence",
                "shade_ratio",
                "recent_direct_sun_minutes",
                "surface_code",
            }
            missing_columns = required_columns.difference(edges.columns)
            if missing_columns:
                raise KeyError(f"Edge 필수 컬럼 누락: {sorted(missing_columns)}")
            edges["edge_id"] = edges["edge_id"].astype(str)
            heat_cost = pd.to_numeric(edges["heat_cost"], errors="raise")
            if not heat_cost.isin([0, 1, 2]).all():
                raise ValueError("최종 GMM Heat Cost는 0, 1, 2만 허용합니다.")

            mapping = pd.read_csv(runtime / "cluster_heatcost_mapping.csv", encoding="utf-8-sig")
            high_clusters = mapping.loc[mapping["heat_cost"].eq(2), "cluster_raw"]
            if len(high_clusters) != 1:
                raise ValueError("heat_cost=2인 GMM raw cluster는 정확히 하나여야 합니다.")
            high_cluster_raw = int(high_clusters.iloc[0])
            probability_column = f"cluster_prob_{high_cluster_raw}"
            if probability_column not in edges.columns:
                raise KeyError(f"고온 군집 posterior 컬럼 누락: {probability_column}")

            reference = json.loads(
                (runtime / "route_safety_payload.json").read_text(encoding="utf-8")
            )
            thresholds = RouteSafetyThresholds.model_validate(reference["thresholds"])
            graph = self._build_graph(edges)
            node_array = np.asarray(list(graph.nodes), dtype=float)
            if graph.number_of_nodes() == 0 or node_array.size == 0:
                raise ValueError("최종 모델 보행 그래프에 Node가 없습니다.")

            edge_by_id = edges.drop_duplicates("edge_id").set_index("edge_id")
            self._assets = _RuntimeAssets(
                edges=edges,
                edge_by_id=edge_by_id,
                graph=graph,
                node_array=node_array,
                high_cluster_raw=high_cluster_raw,
                high_probability_column=probability_column,
                air_temperature_c=float(reference["air_temperature_c"]),
                alert_alpha=float(reference["alert_alpha"]),
                temperature_min_c=0.0,
                temperature_max_c=50.0,
                thresholds=thresholds,
            )
            return self._assets

    def _analyze_sync(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        assets = self._load_assets()
        points = gpd.GeoSeries(
            [
                Point(request.origin.lng, request.origin.lat),
                Point(request.destination.lng, request.destination.lat),
            ],
            crs="EPSG:4326",
        ).to_crs(MODEL_CRS)
        start = self._nearest_node(assets, points.iloc[0])
        end = self._nearest_node(assets, points.iloc[1])

        shortest_segments = self._route_segments(assets.graph, start, end, "distance_weight")
        heat_segments = self._route_segments(assets.graph, start, end, "heat_route_weight")
        shortest = self._summarize_route(
            assets,
            shortest_segments,
            label="일반 최단경로",
            route_kind="shortest",
        )
        recommended = self._summarize_route(
            assets,
            heat_segments,
            label="온:길 추천",
            route_kind="ongil",
        )
        comparison = RouteStatisticsService.compare(shortest, recommended)
        digest_source = (
            f"{request.origin.lat:.6f},{request.origin.lng:.6f}|"
            f"{request.destination.lat:.6f},{request.destination.lng:.6f}|"
            f"{recommended.route_id}"
        )
        digest = hashlib.sha256(digest_source.encode("utf-8")).hexdigest()[:12]

        warnings = [
            WarningMessage(
                code="FIXED_MODEL_SNAPSHOT",
                message=(
                    "2026-08-15 16:00 KST 전체 보행로 GMM 분석 결과를 사용했습니다. "
                    "현재 시각의 실시간 노면 상태가 아닙니다."
                ),
            ),
            WarningMessage(
                code="RELATIVE_GMM_HEAT_COST",
                message=(
                    "Edge Heat Cost 0·1·2는 GMM 군집의 상대 열노출 순위입니다. "
                    "경로 열위험 점수와 실제 노면온도(℃) 또는 화상 확률을 뜻하지 않습니다."
                ),
            ),
        ]
        if comparison.same_route:
            warnings.append(
                WarningMessage(
                    code="SAME_ROUTE",
                    message="선택한 두 지점에서는 최단경로와 Heat Cost 최적 경로가 같습니다.",
                )
            )

        return RouteAnalysisResponse(
            analysis_id=f"analysis_{digest}",
            analysis_source="ongil_gmm_0815_1600",
            validation_status="not_validated",
            requested_departure_at=request.departure_at,
            generated_at=datetime.now(UTC),
            data_valid_at=TARGET_TIME,
            graph_version=f"{MODEL_VERSION}-edges-{len(assets.edges)}",
            heat_data_version=f"{MODEL_VERSION}-snapshot-20260815-1600",
            weight_profile=WeightProfileResponse(id="length_x_1_plus_heat_penalty_1.0"),
            warnings=warnings,
            shortest=shortest,
            pawsafe=recommended,
            comparison=comparison,
            heat_segments=self._to_heat_segments(assets, heat_segments),
        )

    @staticmethod
    def _node_key(coordinate: tuple[float, float]) -> tuple[float, float]:
        x, y = coordinate
        return (round(x / NODE_SNAP_M) * NODE_SNAP_M, round(y / NODE_SNAP_M) * NODE_SNAP_M)

    @classmethod
    def _build_graph(cls, edges: gpd.GeoDataFrame) -> nx.MultiGraph:
        graph = nx.MultiGraph()
        exploded = edges.explode(index_parts=False).reset_index(drop=True)
        for row in exploded.itertuples():
            geometry = row.geometry
            if geometry is None or geometry.is_empty or geometry.geom_type != "LineString":
                continue
            coordinates = list(geometry.coords)
            for start_coordinate, end_coordinate in pairwise(coordinates):
                start = cls._node_key(start_coordinate)
                end = cls._node_key(end_coordinate)
                if start == end:
                    continue
                segment_geometry = LineString([start, end])
                length_m = float(segment_geometry.length)
                if length_m <= 0:
                    continue
                relative_heat = int(row.heat_cost)
                graph.add_edge(
                    start,
                    end,
                    edge_id=str(row.edge_id),
                    length_m=length_m,
                    heat_cost=relative_heat,
                    distance_weight=length_m,
                    heat_route_weight=length_m * (1 + HEAT_PENALTY * relative_heat),
                    geometry=segment_geometry,
                )
        return graph

    def _nearest_node(self, assets: _RuntimeAssets, point: Point) -> tuple[float, float]:
        distances = np.hypot(assets.node_array[:, 0] - point.x, assets.node_array[:, 1] - point.y)
        index = int(distances.argmin())
        if float(distances[index]) > self._max_node_match_distance_m:
            raise NoWalkableNodeError()
        return (
            float(assets.node_array[index, 0]),
            float(assets.node_array[index, 1]),
        )

    @staticmethod
    def _route_segments(
        graph: nx.MultiGraph,
        start: tuple[float, float],
        end: tuple[float, float],
        weight_attribute: str,
    ) -> list[dict[str, Any]]:
        nodes = nx.shortest_path(graph, start, end, weight=weight_attribute, method="dijkstra")
        segments: list[dict[str, Any]] = []
        for order, (u, v) in enumerate(pairwise(nodes), start=1):
            alternatives = graph.get_edge_data(u, v)
            if not alternatives:
                raise nx.NetworkXNoPath
            _, selected = min(
                alternatives.items(),
                key=lambda item: float(item[1].get(weight_attribute, math.inf)),
            )
            segments.append(
                {
                    "order": order,
                    "edge_id": str(selected["edge_id"]),
                    "length_m": float(selected["length_m"]),
                    "heat_cost": int(selected["heat_cost"]),
                    "geometry": LineString([u, v]),
                }
            )
        if not segments:
            raise NoRouteError()
        return segments

    def _summarize_route(
        self,
        assets: _RuntimeAssets,
        segments: list[dict[str, Any]],
        *,
        label: str,
        route_kind: str,
    ) -> RouteSummary:
        distance = sum(segment["length_m"] for segment in segments)
        if distance <= 0:
            raise NoRouteError()
        weighted_heat = (
            sum(segment["length_m"] * segment["heat_cost"] for segment in segments) / distance
        )
        shade_ratio = self._weighted_edge_value(assets, segments, "shade_ratio")
        duration_min = max(1, round(distance / self._walking_speed))
        direct_sun = duration_min * (1 - shade_ratio) if shade_ratio is not None else None
        edge_ids = [segment["edge_id"] for segment in segments]
        digest = hashlib.sha256("|".join(edge_ids).encode("utf-8")).hexdigest()[:10]
        route_id = f"{route_kind}_{digest}"
        safety = self._build_safety_payload(assets, segments, route_id)
        return RouteSummary(
            route_id=route_id,
            label=label,
            route_source="ongil_gmm_graph",
            geometry=self._route_geometry(segments),
            distance_m=round(distance),
            duration_min=duration_min,
            heat_cost=round(weighted_heat, 3),
            shade_ratio=round(shade_ratio, 3) if shade_ratio is not None else None,
            direct_sun_minutes=round(direct_sun, 1) if direct_sun is not None else None,
            edge_count=len(set(edge_ids)),
            safety=safety,
        )

    def _build_safety_payload(
        self,
        assets: _RuntimeAssets,
        segments: list[dict[str, Any]],
        route_id: str,
    ) -> RouteSafetyPayload:
        distance = sum(segment["length_m"] for segment in segments)
        weighted_probability = 0.0
        for segment in segments:
            edge = assets.edge_by_id.loc[segment["edge_id"]]
            probability = float(edge[assets.high_probability_column])
            weighted_probability += segment["length_m"] * float(np.clip(probability, 0.0, 1.0))
        weighted_probability /= distance

        temperature_factor = float(
            np.clip(
                (assets.air_temperature_c - assets.temperature_min_c)
                / (assets.temperature_max_c - assets.temperature_min_c),
                0.0,
                1.0,
            )
        )
        unit_heat_cost = assets.alert_alpha * temperature_factor * weighted_probability
        raw_score = float(np.clip(unit_heat_cost / assets.alert_alpha * 100.0, 0.0, 100.0))
        display_score = int(np.clip(math.floor(raw_score + 0.5), 1, 100))
        if display_score <= assets.thresholds.comfortable_max:
            status, color = "comfortable", "green"
            message = f"오늘 산책길은 아주 쾌적해요. (점수: {display_score}점)"
        elif display_score < assets.thresholds.warning_min:
            status, color = "caution", "yellow"
            message = f"조금 더운 구간이 있으니 물을 챙겨 주세요. (점수: {display_score}점)"
        else:
            status, color = "danger", "red"
            message = (
                f"경로 열위험 점수가 높습니다. 산책을 자제해 주세요. (점수: {display_score}점)"
            )

        return RouteSafetyPayload(
            route_id=route_id,
            target_time_kst=TARGET_TIME,
            score=display_score,
            score_raw_0_100=round(raw_score, 4),
            unit_heat_cost_0_to_alpha=round(unit_heat_cost, 6),
            route_distance_m=round(distance, 3),
            air_temperature_c=round(assets.air_temperature_c, 3),
            temperature_factor_0_1=round(temperature_factor, 6),
            weighted_mean_p_high=round(weighted_probability, 6),
            high_heat_cluster_raw=assets.high_cluster_raw,
            alert_alpha=assets.alert_alpha,
            status=status,
            color=color,
            should_warn=display_score >= assets.thresholds.warning_min,
            message=message,
            thresholds=assets.thresholds,
            calibrated_safety_threshold=False,
            method_note=(
                "경로 확정 후 길이 가중 alpha*f(T)*P(High)를 1~100 UI 점수로 환산; "
                "실측 노면온도 또는 화상 확률이 아님"
            ),
        )

    def _to_heat_segments(
        self,
        assets: _RuntimeAssets,
        segments: list[dict[str, Any]],
    ) -> list[HeatSegment]:
        output: list[HeatSegment] = []
        for segment in segments:
            edge_id = segment["edge_id"]
            edge = assets.edge_by_id.loc[edge_id]
            relative_heat = int(segment["heat_cost"])
            output.append(
                HeatSegment(
                    edge_id=edge_id,
                    display_name=f"경로 {segment['order']} 구간",
                    level=(
                        "low" if relative_heat == 0 else "medium" if relative_heat == 1 else "high"
                    ),
                    heat_cost=float(relative_heat),
                    shade_ratio=self._number(edge, "shade_ratio"),
                    direct_sun_minutes=self._number(edge, "recent_direct_sun_minutes"),
                    surface_type=str(edge.get("surface_code", "unknown")),
                    confidence=self._number(edge, "cluster_confidence"),
                    data_valid_at=TARGET_TIME,
                    validation_status="not_validated",
                    geometry=self._line_geometry(segment["geometry"]),
                )
            )
        return output

    @staticmethod
    def _weighted_edge_value(
        assets: _RuntimeAssets,
        segments: list[dict[str, Any]],
        column: str,
    ) -> float | None:
        values: list[tuple[float, float]] = []
        for segment in segments:
            value = OngilGmmAnalysisProvider._number(
                assets.edge_by_id.loc[segment["edge_id"]],
                column,
            )
            if value is not None:
                values.append((segment["length_m"], value))
        total = sum(length for length, _ in values)
        return sum(length * value for length, value in values) / total if total else None

    @staticmethod
    def _number(row: Any, column: str) -> float | None:
        value = row.get(column)
        return None if value is None or pd.isna(value) else float(value)

    @classmethod
    def _route_geometry(cls, segments: list[dict[str, Any]]) -> LineStringGeometry:
        coordinates: list[tuple[float, float]] = []
        for segment in segments:
            current = list(segment["geometry"].coords)
            if coordinates and coordinates[-1] != current[0]:
                current.reverse()
            coordinates.extend(current if not coordinates else current[1:])
        return cls._line_geometry(LineString(coordinates))

    @staticmethod
    def _line_geometry(geometry: LineString) -> LineStringGeometry:
        transformed = gpd.GeoSeries([geometry], crs=MODEL_CRS).to_crs("EPSG:4326").iloc[0]
        return LineStringGeometry(
            coordinates=[
                (round(float(lng), 6), round(float(lat), 6)) for lng, lat in transformed.coords
            ]
        )
