"""Apply a saved PawSafe clustering bundle to new Edge x time features."""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

CONTINUOUS_HEAT_FEATURES = [
    "recent_direct_sun_minutes",
    "cumulative_effective_solar_mj_m2",
    "shade_ratio",
    "air_temperature_c",
    "wind_speed_ms",
    "heat_storage_proxy",
]

CONTINUOUS_HEAT_WEIGHTS = {
    "recent_direct_sun_minutes": 0.20,
    "cumulative_effective_solar_mj_m2": 0.30,
    "shade_ratio": -0.20,
    "air_temperature_c": 0.15,
    "wind_speed_ms": -0.05,
    "heat_storage_proxy": 0.20,
}


def load_model_bundle(path: str | Path) -> dict:
    model_path = Path(path)
    if not model_path.exists():
        raise FileNotFoundError(
            f"모델 파일이 없습니다: {model_path}. 먼저 run_pipeline.py를 완료해 주세요."
        )
    bundle = joblib.load(model_path)
    if bundle.get("schema_version") == 5:
        required = {
            "cluster_features",
            "cluster_medians",
            "cluster_scaler",
            "heat_axis",
            "heat_bounds",
            "heat_features",
            "kmeans",
        }
    else:
        required = {"scaler", "model", "features", "cluster_heat"}
    missing = required.difference(bundle)
    if missing:
        raise ValueError(f"모델 묶음에 필요한 항목이 없습니다: {sorted(missing)}")
    return bundle


def score_features(features: pd.DataFrame, bundle: dict) -> pd.DataFrame:
    if bundle.get("schema_version") == 5:
        return _score_summer_service_model(features, bundle)

    columns = list(bundle["features"])
    missing = [column for column in columns if column not in features]
    if missing:
        raise ValueError(f"모델 입력 feature가 없습니다: {missing}")

    xdf = features[columns].replace([np.inf, -np.inf], np.nan).copy()
    fill_values = bundle.get("fill_values", {})
    if fill_values:
        for column in columns:
            xdf[column] = xdf[column].fillna(fill_values.get(column, 0.0))
    xdf = xdf.fillna(0.0)

    X = bundle["scaler"].transform(xdf)
    model = bundle["model"]
    labels = model.predict(X)
    cluster_heat = {int(key): float(value) for key, value in bundle["cluster_heat"].items()}
    ordered_clusters = sorted(cluster_heat)
    heat_values = np.asarray(
        [cluster_heat[cluster] for cluster in ordered_clusters],
        dtype=float,
    )

    if bundle.get("model_type") == "gmm" and hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)
        heat = probabilities @ heat_values
    else:
        heat = np.asarray(
            [cluster_heat.get(int(label), 50.0) for label in labels],
            dtype=float,
        )

    result = features.copy()
    result["cluster"] = labels.astype(int)
    result["heat_cost"] = np.clip(heat, 0.0, 100.0)
    return result


def _score_summer_service_model(features: pd.DataFrame, bundle: dict) -> pd.DataFrame:
    """Apply the model team's fixed 09:00--21:00 training scale.

    Unlike the legacy online display score, schema v5 must not be re-fitted or
    re-scaled against the current request. The saved PCA axis and 09--21
    training bounds define the stable 0--100 Heat Cost scale.
    """

    heat_axis = bundle["heat_axis"]
    heat_columns = list(heat_axis["columns"])
    missing = [column for column in heat_columns if column not in features]
    if missing:
        raise ValueError(f"여름 모델 Heat Cost feature가 없습니다: {missing}")

    heat_medians = pd.Series(heat_axis["medians"], dtype=float)
    heat_input = features[heat_columns].replace([np.inf, -np.inf], np.nan)
    heat_input = heat_input.fillna(heat_medians)
    standardized = heat_axis["scaler"].transform(heat_input)
    projection = heat_axis["pca"].transform(standardized)[:, 0]
    low, high = (float(value) for value in bundle["heat_bounds"])
    if not np.isfinite(low) or not np.isfinite(high) or high <= low:
        raise ValueError("여름 모델 Heat Cost 경계가 올바르지 않습니다.")

    result = features.copy()
    result["heat_cost"] = np.clip((projection - low) / (high - low) * 100.0, 0.0, 100.0)

    cluster_columns = list(bundle["cluster_features"])
    cluster_missing = [column for column in cluster_columns if column not in result]
    if cluster_missing:
        raise ValueError(f"여름 모델 군집 feature가 없습니다: {cluster_missing}")
    cluster_medians = pd.Series(bundle["cluster_medians"], dtype=float)
    cluster_input = result[cluster_columns].replace([np.inf, -np.inf], np.nan)
    cluster_input = cluster_input.fillna(cluster_medians)
    cluster_standardized = bundle["cluster_scaler"].transform(cluster_input)
    cluster_pca = bundle.get("cluster_pca")
    if cluster_pca is not None:
        cluster_standardized = cluster_pca.transform(cluster_standardized)
    result["cluster"] = bundle["kmeans"].predict(cluster_standardized).astype(int)
    result["cluster_name"] = result["cluster"].map(bundle.get("cluster_names", {}))
    return result


def add_continuous_heat_cost(
    features: pd.DataFrame,
    *,
    low_quantile: float = 0.05,
    high_quantile: float = 0.95,
) -> pd.DataFrame:
    """Add the continuous 0--100 Heat Cost used by the QGIS heat layer.

    The saved clustering bundle intentionally stores a coarse cluster-level
    score (for the current demo it is 0 or 100).  The QGIS project, however,
    already uses the physically-directed continuous proxy with 20-point
    display bands.  This function keeps that same definition for online
    forecast inference, so KMA weather still changes the features while the
    route receives a useful continuous score instead of a binary label.
    """

    missing = [column for column in CONTINUOUS_HEAT_FEATURES if column not in features.columns]
    if missing:
        raise ValueError(f"연속 Heat Cost에 필요한 feature가 없습니다: {missing}")

    result = features.copy()
    xdf = result[CONTINUOUS_HEAT_FEATURES].replace(
        [np.inf, -np.inf],
        np.nan,
    )
    xdf = xdf.fillna(xdf.median(numeric_only=True)).fillna(0.0)

    z = pd.DataFrame(
        StandardScaler().fit_transform(xdf),
        columns=CONTINUOUS_HEAT_FEATURES,
        index=result.index,
    )
    raw = sum(z[column] * CONTINUOUS_HEAT_WEIGHTS[column] for column in CONTINUOUS_HEAT_FEATURES)

    low = float(raw.quantile(low_quantile))
    high = float(raw.quantile(high_quantile))
    if not np.isfinite(low) or not np.isfinite(high) or high <= low:
        # If every edge is genuinely identical, there is no defensible
        # ranking. Keep the neutral midpoint instead of fabricating 0 heat.
        continuous = np.full(len(result), 50.0, dtype=float)
    else:
        continuous = ((raw - low) / (high - low) * 100.0).clip(0.0, 100.0)

    result["heat_cost_continuous"] = np.asarray(continuous, dtype=float)
    return result
