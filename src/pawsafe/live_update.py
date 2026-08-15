from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

import geopandas as gpd
import joblib
import numpy as np
import pandas as pd

from .utils import read_csv_auto
from shapely.geometry import LineString, Point, mapping


WEATHER_COLUMNS = [
    "observed_at",
    "temperature_c",
    "humidity_pct",
    "wind_speed_ms",
    "rainfall_mm",
    "grid_x",
    "grid_y",
    "source",
    "fetched_at",
]

ASOS_COLUMNS = [
    "observed_at",
    "station_id",
    "station_name",
    "temperature_c",
    "humidity_pct",
    "wind_speed_ms",
    "rainfall_mm",
    "solar_radiation_mj_m2",
    "sunshine_hours",
    "source",
    "fetched_at",
]

GRAPH_EXPORT_VERSION = "v2"


def fetch_weather_json(api_url: str, timeout_seconds: float = 15) -> dict[str, Any]:
    with urlopen(api_url, timeout=timeout_seconds) as response:  # noqa: S310
        payload = json.load(response)
    required = {
        "observed_at",
        "temperature_c",
        "humidity_pct",
        "wind_speed_ms",
        "rainfall_mm",
    }
    if not isinstance(payload, dict) or not required.issubset(payload):
        raise ValueError("기상 API 응답에 필수 필드가 없습니다.")
    return payload


def append_weather_csv(payload: dict[str, Any], path: Path) -> pd.DataFrame:
    path.parent.mkdir(parents=True, exist_ok=True)
    row = {
        "observed_at": pd.Timestamp(payload["observed_at"]),
        "temperature_c": payload["temperature_c"],
        "humidity_pct": payload["humidity_pct"],
        "wind_speed_ms": payload["wind_speed_ms"],
        "rainfall_mm": payload["rainfall_mm"],
        "grid_x": payload.get("grid_x"),
        "grid_y": payload.get("grid_y"),
        "source": payload.get("source", "KMA_ULTRA_SHORT_NOWCAST"),
        "fetched_at": pd.Timestamp.now(tz="Asia/Seoul"),
    }
    current = (
        pd.read_csv(path) if path.exists() else pd.DataFrame(columns=WEATHER_COLUMNS)
    )
    updated = pd.concat([current, pd.DataFrame([row])], ignore_index=True)
    updated["observed_at"] = pd.to_datetime(
        updated["observed_at"], format="mixed", utc=True
    ).dt.tz_convert("Asia/Seoul")
    updated["fetched_at"] = pd.to_datetime(
        updated["fetched_at"], format="mixed", utc=True
    ).dt.tz_convert("Asia/Seoul")
    updated = (
        updated.sort_values("fetched_at")
        .drop_duplicates(subset=["observed_at"], keep="last")
        .sort_values("observed_at")
    )
    temp_path = path.with_suffix(path.suffix + ".tmp")
    updated.to_csv(temp_path, index=False, encoding="utf-8-sig")
    os.replace(temp_path, path)
    return updated.reset_index(drop=True)


def append_asos_csv(payload: dict[str, Any], path: Path) -> pd.DataFrame:
    path.parent.mkdir(parents=True, exist_ok=True)
    row = {
        column: payload.get(column) for column in ASOS_COLUMNS if column != "fetched_at"
    }
    row["fetched_at"] = pd.Timestamp.now(tz="Asia/Seoul")
    current = pd.read_csv(path) if path.exists() else pd.DataFrame(columns=ASOS_COLUMNS)
    updated = pd.concat([current, pd.DataFrame([row])], ignore_index=True)
    updated["observed_at"] = pd.to_datetime(
        updated["observed_at"], format="mixed", utc=True
    ).dt.tz_convert("Asia/Seoul")
    updated["fetched_at"] = pd.to_datetime(
        updated["fetched_at"], format="mixed", utc=True
    ).dt.tz_convert("Asia/Seoul")
    updated = (
        updated.sort_values("fetched_at")
        .drop_duplicates(subset=["station_id", "observed_at"], keep="last")
        .sort_values("observed_at")
    )
    temp_path = path.with_suffix(path.suffix + ".tmp")
    updated.to_csv(temp_path, index=False, encoding="utf-8-sig")
    os.replace(temp_path, path)
    return updated.reset_index(drop=True)


def _hour_distance(hours: pd.Series, target_hour: int) -> pd.Series:
    difference = (hours - target_hour).abs()
    return np.minimum(difference, 24 - difference)


def select_hour_template(
    features: pd.DataFrame, observed_at: pd.Timestamp
) -> pd.DataFrame:
    timestamps = pd.to_datetime(features["timestamp"])
    available = pd.DataFrame(
        {
            "timestamp": timestamps.drop_duplicates(),
        }
    )
    available["distance"] = _hour_distance(
        available["timestamp"].dt.hour, observed_at.hour
    )
    template_time = available.sort_values(["distance", "timestamp"]).iloc[0][
        "timestamp"
    ]
    return features.loc[timestamps.eq(template_time)].copy()


def build_live_features(
    historical_features: pd.DataFrame,
    weather: dict[str, Any],
    cfg: dict,
    asos: dict[str, Any] | None = None,
) -> pd.DataFrame:
    observed_at = pd.Timestamp(weather["observed_at"])
    current = select_hour_template(historical_features, observed_at)
    previous = select_hour_template(
        historical_features, observed_at - pd.Timedelta(hours=1)
    )
    previous_storage = previous.set_index("edge_id")["heat_storage_proxy"]

    current["timestamp"] = observed_at
    current["air_temperature_c"] = float(weather["temperature_c"])
    current["humidity_pct"] = float(weather["humidity_pct"])
    current["wind_speed_ms"] = float(weather["wind_speed_ms"])
    current["rainfall_mm"] = float(weather["rainfall_mm"])

    asos_solar = asos.get("solar_radiation_mj_m2") if asos else None
    if asos_solar is not None:
        current["solar_radiation_mj_m2"] = float(asos_solar)
        current["effective_solar_mj_m2"] = (
            current["solar_radiation_mj_m2"]
            * current["sun_fraction"]
            * current["surface_absorptivity"]
        )

    dt_hours = cfg["time"]["shadow_interval_minutes"] / 60
    base_decay = np.exp(-dt_hours / cfg["heat"]["thermal_memory_hours"])
    cooling = (
        1
        + cfg["heat"]["wind_cooling_factor"] * current["wind_speed_ms"]
        + cfg["heat"]["rain_cooling_factor"] * current["rainfall_mm"]
    )
    prior = current["edge_id"].map(previous_storage).fillna(0)
    current["heat_storage_proxy"] = (
        prior * np.power(base_decay, cooling) + current["effective_solar_mj_m2"]
    )
    current["weather_source"] = weather.get("source", "KMA_ULTRA_SHORT_NOWCAST")
    current["solar_source"] = (
        f"ASOS_STATION_{asos['station_id']}_PREVIOUS_DAY_REFERENCE"
        if asos_solar is not None
        else "ASOS_HISTORICAL_HOUR_TEMPLATE"
    )
    current["validation_status"] = "not_validated"
    return current


def score_with_saved_model(
    features: pd.DataFrame,
    model_path: Path,
    cfg: dict,
    calibration_features: pd.DataFrame,
) -> pd.DataFrame:
    bundle = joblib.load(model_path)
    columns = bundle["features"]
    values = features[columns].replace([np.inf, -np.inf], np.nan)
    values = values.fillna(values.median(numeric_only=True)).fillna(0)
    transformed = bundle["scaler"].transform(values)
    model = bundle["model"]
    labels = model.predict(transformed)

    scored = features.copy()
    scored["cluster"] = labels

    weights = (
        pd.Series(cfg["clustering"]["heat_direction_weights"])
        .reindex(columns)
        .fillna(0)
    )
    current_raw = transformed @ weights.to_numpy()
    calibration = calibration_features[columns].replace([np.inf, -np.inf], np.nan)
    calibration = calibration.fillna(calibration.median(numeric_only=True)).fillna(0)
    calibration_raw = bundle["scaler"].transform(calibration) @ weights.to_numpy()
    low, high = np.quantile(calibration_raw, [0.05, 0.95])
    if high <= low:
        raise ValueError("Heat Cost 고정 변환 범위가 올바르지 않습니다.")
    scored["heat_cost"] = np.clip((current_raw - low) / (high - low) * 100, 0, 100)
    return scored


def write_live_outputs(
    scored: pd.DataFrame,
    edges_path: Path,
    processed_path: Path,
    heat_map_path: Path,
    app_heat_path: Path,
) -> None:
    processed_path.parent.mkdir(parents=True, exist_ok=True)
    heat_map_path.parent.mkdir(parents=True, exist_ok=True)
    scored.to_parquet(processed_path, index=False)

    edges = gpd.read_file(edges_path, layer="edges")
    columns = [
        "edge_id",
        "timestamp",
        "heat_cost",
        "shade_ratio",
        "recent_direct_sun_minutes",
        "cumulative_effective_solar_mj_m2",
        "surface_code",
        "surface_absorptivity",
        "weather_source",
        "solar_source",
        "validation_status",
    ]
    merged = edges.merge(
        scored[columns], on="edge_id", how="left", suffixes=("_edge", "")
    )
    merged = merged.to_crs(4326)
    merged["heat_level"] = pd.cut(
        merged["heat_cost"],
        bins=[0, 20, 40, 60, 80, 100],
        labels=["very_low", "low", "medium", "high", "very_high"],
        include_lowest=True,
    )

    _write_geojson_atomic(merged, heat_map_path)
    app_columns = [
        "edge_id",
        "osm_id",
        "name",
        "fclass",
        "length_m",
        "timestamp",
        "heat_cost",
        "heat_level",
        "shade_ratio",
        "recent_direct_sun_minutes",
        "cumulative_effective_solar_mj_m2",
        "surface_code",
        "surface_absorptivity",
        "weather_source",
        "solar_source",
        "validation_status",
        "geometry",
    ]
    _write_geojson_atomic(merged[app_columns], app_heat_path)


def _write_geojson_atomic(frame: gpd.GeoDataFrame, path: Path) -> None:
    temp_path = path.with_suffix(".tmp.geojson")
    frame.to_file(temp_path, driver="GeoJSON")
    os.replace(temp_path, path)


def ensure_backend_graph_exports(root: Path, cfg: dict) -> dict[str, Path]:
    from .routing import build_graph

    backend_exports = root / "backend/data/exports"
    backend_exports.mkdir(parents=True, exist_ok=True)
    graph_path = backend_exports / "walk_graph.gpkg"
    lookup_path = backend_exports / "heat_edge_nodes.parquet"
    coverage_path = backend_exports / "coverage.geojson"
    version_path = backend_exports / "graph_export_version.txt"
    if (
        graph_path.exists()
        and lookup_path.exists()
        and coverage_path.exists()
        and version_path.exists()
        and version_path.read_text(encoding="utf-8").strip() == GRAPH_EXPORT_VERSION
    ):
        return {
            "graph": graph_path,
            "lookup": lookup_path,
            "coverage": coverage_path,
        }

    edges = gpd.read_file(root / "data/processed/edges_static.gpkg", layer="edges")
    graph, _ = build_graph(edges, cfg)
    ordered_nodes = sorted(graph.nodes)
    node_ids = {node: f"n{index:06d}" for index, node in enumerate(ordered_nodes)}
    nodes = gpd.GeoDataFrame(
        [
            {"node_id": node_ids[node], "geometry": Point(node)}
            for node in ordered_nodes
        ],
        crs=cfg["project_crs"],
    )
    edge_names = (
        edges.set_index("edge_id")["name"]
        .replace(r"^\s*$", "이름 없는 보행 구간", regex=True)
        .fillna("이름 없는 보행 구간")
        .to_dict()
    )
    edge_rows: list[dict[str, Any]] = []
    heat_lookup: dict[str, dict[str, str]] = {}
    for index, (u, v, _key, data) in enumerate(graph.edges(keys=True, data=True)):
        coordinates = list(data["geometry"].coords)
        forward = Point(coordinates[0]).distance(Point(u)) + Point(
            coordinates[-1]
        ).distance(Point(v))
        reverse = Point(coordinates[-1]).distance(Point(u)) + Point(
            coordinates[0]
        ).distance(Point(v))
        if reverse < forward:
            coordinates.reverse()
        coordinates[0] = u
        coordinates[-1] = v
        heat_edge_id = str(data["edge_id"])
        from_node = node_ids[u]
        to_node = node_ids[v]
        heat_lookup.setdefault(
            heat_edge_id,
            {
                "edge_id": heat_edge_id,
                "from_node": from_node,
                "to_node": to_node,
            },
        )
        edge_rows.append(
            {
                "edge_id": f"segment_{index:07d}",
                "heat_edge_id": heat_edge_id,
                "from_node": from_node,
                "to_node": to_node,
                "distance_m": float(data["length_m"]),
                "display_name": str(
                    edge_names.get(heat_edge_id, "이름 없는 보행 구간")
                ),
                "bidirectional": True,
                "walkable": True,
                "geometry": LineString(coordinates),
            }
        )
    graph_edges = gpd.GeoDataFrame(edge_rows, crs=cfg["project_crs"])
    temp_graph = graph_path.with_name("walk_graph.tmp.gpkg")
    if temp_graph.exists():
        temp_graph.unlink()
    nodes.to_file(temp_graph, layer="nodes", driver="GPKG")
    graph_edges.to_file(temp_graph, layer="edges", driver="GPKG", mode="a")
    os.replace(temp_graph, graph_path)
    pd.DataFrame(heat_lookup.values()).to_parquet(lookup_path, index=False)

    boundary = gpd.read_file(cfg["files"]["boundary"]).to_crs(4326).geometry.union_all()
    if boundary.geom_type == "MultiPolygon":
        boundary = max(boundary.geoms, key=lambda geometry: geometry.area)
    coverage_payload = {
        "type": "Feature",
        "properties": {
            "coverage_id": "songpa-live-v1",
            "name": "서울특별시 송파구 PawSafe 분석 범위",
            "is_demo": False,
        },
        "geometry": mapping(boundary),
    }
    temp_coverage = coverage_path.with_suffix(".tmp.geojson")
    temp_coverage.write_text(
        json.dumps(coverage_payload, ensure_ascii=False),
        encoding="utf-8",
    )
    os.replace(temp_coverage, coverage_path)
    version_path.write_text(GRAPH_EXPORT_VERSION, encoding="utf-8")
    return {"graph": graph_path, "lookup": lookup_path, "coverage": coverage_path}


def write_backend_heat_snapshot(
    scored: pd.DataFrame,
    observed_at: str,
    lookup_path: Path,
    output_path: Path,
) -> None:
    lookup = pd.read_parquet(lookup_path)
    selected = scored[
        [
            "edge_id",
            "heat_cost",
            "shade_ratio",
            "recent_direct_sun_minutes",
            "surface_code",
        ]
    ].merge(lookup, on="edge_id", how="inner")
    valid_at = pd.Timestamp(observed_at).isoformat()
    data_version = f"live-{pd.Timestamp(observed_at).strftime('%Y%m%dT%H%M%z')}"
    records = [
        {
            "edge_id": str(row.edge_id),
            "from_node": str(row.from_node),
            "to_node": str(row.to_node),
            "valid_at": valid_at,
            "heat_cost": float(row.heat_cost),
            "shade_ratio": float(row.shade_ratio),
            "direct_sun_minutes": float(row.recent_direct_sun_minutes),
            "surface_type": str(row.surface_code),
            "confidence": None,
            "validation_status": "not_validated",
            "data_version": data_version,
        }
        for row in selected.itertuples(index=False)
    ]
    payload = {
        "data_version": data_version,
        "is_demo": False,
        "records": records,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_suffix(".tmp.json")
    temp_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    os.replace(temp_path, output_path)


def update_once(
    root: Path, api_url: str, asos_api_url: str | None = None
) -> dict[str, Any]:
    from .utils import load_config

    cfg = load_config(root / "config.json")
    weather = fetch_weather_json(api_url)
    append_weather_csv(weather, root / "data/live/kma_weather.csv")
    if asos_api_url:
        separator = "&" if "?" in asos_api_url else "?"
        aligned_asos_url = (
            f"{asos_api_url}{separator}"
            f"{urlencode({'reference_at': weather['observed_at']})}"
        )
        asos = fetch_weather_json(aligned_asos_url)
    else:
        asos = None
    if asos:
        append_asos_csv(asos, root / "data/live/asos_hourly.csv")
    feature_path = Path(cfg["files"].get("edge_time_features", ""))
    if feature_path.suffix.lower() == ".csv":
        historical = read_csv_auto(feature_path)
    else:
        historical = pd.read_parquet(feature_path)
    live_features = build_live_features(historical, weather, cfg, asos)
    scored = score_with_saved_model(
        live_features,
        root / "outputs/heat_cluster_model.joblib",
        cfg,
        historical,
    )
    write_live_outputs(
        scored,
        root / "data/processed/edges_static.gpkg",
        root / "data/processed/edge_time_features_live.parquet",
        root / "outputs/edge_heat_live.geojson",
        root / "outputs/app_edge_heat.geojson",
    )
    backend_exports = ensure_backend_graph_exports(root, cfg)
    backend_heat_path = root / "backend/data/exports/edge_heat_cost.json"
    write_backend_heat_snapshot(
        scored,
        weather["observed_at"],
        backend_exports["lookup"],
        backend_heat_path,
    )
    return {
        "observed_at": weather["observed_at"],
        "edge_count": int(len(scored)),
        "mean_heat_cost": float(scored["heat_cost"].mean()),
        "weather_csv": str(root / "data/live/kma_weather.csv"),
        "asos_csv": str(root / "data/live/asos_hourly.csv") if asos else None,
        "solar_radiation_mj_m2": asos.get("solar_radiation_mj_m2") if asos else None,
        "heat_map": str(root / "outputs/edge_heat_live.geojson"),
        "backend_graph": str(backend_exports["graph"]),
        "backend_heat": str(backend_heat_path),
    }
