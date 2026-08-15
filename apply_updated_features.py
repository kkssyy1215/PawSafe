from __future__ import annotations

from pathlib import Path

import geopandas as gpd
import pandas as pd

from src.pawsafe.clustering import fit_clusters
from src.pawsafe.features import recompute_derived_features
from src.pawsafe.utils import load_config, read_csv_auto


root = Path(__file__).resolve().parent
cfg = load_config(root / "config.json")
source = Path(cfg["files"]["edge_time_features_source"])
features = read_csv_auto(source)
required = {
    "edge_id",
    "timestamp",
    "shade_ratio",
    "solar_radiation_mj_m2",
    "surface_code",
    "surface_absorptivity",
    "wind_speed_ms",
    "rainfall_mm",
}
missing = required.difference(features.columns)
if missing:
    raise ValueError(f"updated CSV 필수 컬럼 누락: {sorted(missing)}")

if features.duplicated(["edge_id", "timestamp"]).any():
    raise ValueError("updated CSV에 edge_id/timestamp 중복이 있습니다.")

features = recompute_derived_features(features, cfg)
scored, _, _ = fit_clusters(features, cfg, root / "outputs")

processed = root / "data/processed/edge_time_features_revised.parquet"
processed_csv = root / "data/processed/edge_time_features_revised.csv"
scored.to_parquet(processed, index=False)
scored.to_csv(processed_csv, index=False, encoding="utf-8-sig")

edges = gpd.read_file(root / "data/processed/edges_static.gpkg", layer="edges")
latest = scored.sort_values("timestamp").groupby("edge_id").tail(1)
heat_map = edges.merge(
    latest[["edge_id", "timestamp", "cluster", "heat_cost", "surface_absorptivity"]],
    on="edge_id",
    how="left",
).to_crs(4326)
heat_map.to_file(root / "outputs/edge_heat_latest_revised.geojson", driver="GeoJSON")

print("updated source:", source)
print("rows:", len(scored), "edges:", scored.edge_id.nunique())
print("mean heat cost:", round(float(scored.heat_cost.mean()), 2))
print("saved:", processed)
print("saved:", root / "outputs/edge_heat_latest_revised.geojson")
