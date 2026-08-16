from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import davies_bouldin_score, silhouette_score
from sklearn.preprocessing import StandardScaler

from .utils import minmax, read_csv_auto


def fit_clusters(features: pd.DataFrame, cfg: dict, output_dir: Path):
    cols = cfg["clustering"]["features"]

    xdf = features[cols].replace([np.inf, -np.inf], np.nan)
    fill_values = xdf.median(numeric_only=True).fillna(0)
    xdf = xdf.fillna(fill_values).fillna(0)

    scaler = StandardScaler()
    X = scaler.fit_transform(xdf)

    rng = np.random.default_rng(int(cfg["clustering"]["random_state"]))

    sample_limit = int(cfg["clustering"].get("sample_limit", 50000))

    sample_idx = rng.choice(
        len(X),
        min(sample_limit, len(X)),
        replace=False,
    )

    rng.shuffle(sample_idx)

    split = max(1, int(len(sample_idx) * 0.8))
    fit_idx = sample_idx[:split]
    eval_idx = sample_idx[split:]

    if len(eval_idx) < 2:
        eval_idx = fit_idx

    min_cluster_fraction_limit = float(cfg["clustering"].get("min_cluster_fraction", 0.05))

    rows = []
    candidates = {}

    # K=2는 제외하고 3개 이상 군집만 평가
    k_values = [int(value) for value in cfg["clustering"]["k_values"] if int(value) >= 3]

    for k in k_values:
        if k >= len(fit_idx):
            continue

        model = KMeans(
            n_clusters=k,
            n_init=20,
            random_state=int(cfg["clustering"]["random_state"]),
        )

        # 전체 109만 행이 아니라 샘플로 학습
        model.fit(X[fit_idx])

        eval_labels = model.predict(X[eval_idx])
        counts = np.bincount(
            eval_labels,
            minlength=k,
        )

        min_cluster_fraction = float(counts.min() / counts.sum())

        # 한 군집이 5% 미만이면 후보에서 제외
        if min_cluster_fraction < min_cluster_fraction_limit:
            continue

        unique_labels = np.unique(eval_labels)

        if len(unique_labels) > 1:
            silhouette = silhouette_score(
                X[eval_idx],
                eval_labels,
            )
            davies_bouldin = davies_bouldin_score(
                X[eval_idx],
                eval_labels,
            )
        else:
            silhouette = -1.0
            davies_bouldin = np.inf

        rows.append(
            {
                "model": "kmeans",
                "k": k,
                "silhouette": silhouette,
                "davies_bouldin": davies_bouldin,
                "min_cluster_fraction": min_cluster_fraction,
            }
        )

        candidates[k] = model

    if not rows:
        raise RuntimeError(
            "최소 군집 비율 조건을 통과한 모델이 없습니다. Feature 분포를 확인해야 합니다."
        )

    metrics = pd.DataFrame(rows)

    # 분리도 + 군집 균형을 함께 반영
    metrics["selection_score"] = (
        metrics["silhouette"].rank(pct=True)
        + (-metrics["davies_bouldin"]).rank(pct=True)
        + metrics["min_cluster_fraction"].rank(pct=True)
    )

    best = metrics.sort_values(
        ["selection_score", "silhouette"],
        ascending=False,
    ).iloc[0]

    best_k = int(best["k"])
    model = candidates[best_k]

    # 전체 Edge x 시간 데이터에 최종 군집 적용
    labels = model.predict(X)

    result = features.copy()
    result["cluster"] = labels

    probs = np.eye(
        best_k,
        dtype=float,
    )[labels]

    z = pd.DataFrame(X, columns=cols)
    z["cluster"] = labels

    profiles_z = z.groupby("cluster")[cols].mean().reindex(range(best_k))

    if profiles_z.isna().any().any():
        raise RuntimeError("최종 군집 중 데이터가 없는 군집이 발견되었습니다.")

    weights = pd.Series(cfg["clustering"]["heat_direction_weights"]).reindex(cols).fillna(0)

    raw_cluster_heat = profiles_z.mul(weights, axis=1).sum(axis=1)

    cluster_heat = minmax(raw_cluster_heat)
    heat_values = cluster_heat.reindex(range(best_k)).to_numpy(dtype=float)

    result["heat_cost"] = probs @ heat_values

    profiles = result.groupby("cluster")[[*cols, "heat_cost"]].mean().reset_index()

    output_dir.mkdir(parents=True, exist_ok=True)

    model_bundle = {
        "scaler": scaler,
        "model": model,
        "features": cols,
        "model_type": "kmeans",
        "k": best_k,
        "cluster_heat": cluster_heat.to_dict(),
        "fill_values": fill_values.to_dict(),
        "min_cluster_fraction": min_cluster_fraction_limit,
        "fit_sample_size": len(fit_idx),
    }

    joblib.dump(
        model_bundle,
        output_dir / "heat_cluster_model.joblib",
    )

    metrics.to_csv(
        output_dir / "cluster_metrics.csv",
        index=False,
        encoding="utf-8-sig",
    )

    profiles.to_csv(
        output_dir / "cluster_profiles.csv",
        index=False,
        encoding="utf-8-sig",
    )

    (output_dir / "model_selection.json").write_text(
        json.dumps(
            best.to_dict(),
            ensure_ascii=False,
            indent=2,
            default=float,
        ),
        encoding="utf-8",
    )

    return result, metrics, profiles


def validate_optional(
    result: pd.DataFrame,
    cfg: dict,
    output_dir: Path,
):
    path = Path(cfg["files"]["measured_surface_temperature"])

    if not path.exists():
        pd.DataFrame(
            columns=[
                "edge_id",
                "timestamp",
                "surface_temperature_c",
            ]
        ).to_csv(
            path,
            index=False,
            encoding="utf-8-sig",
        )
        return None

    measured = read_csv_auto(path)

    required = {
        "edge_id",
        "timestamp",
        "surface_temperature_c",
    }

    if measured.empty or not required.issubset(measured):
        return None

    measured["timestamp"] = pd.to_datetime(measured["timestamp"])

    joined = result.merge(
        measured,
        on=["edge_id", "timestamp"],
    )

    if len(joined) < 5:
        return None

    report = {
        "n": len(joined),
        "spearman_heat_cost_vs_surface_temp": float(
            joined["heat_cost"].corr(
                joined["surface_temperature_c"],
                method="spearman",
            )
        ),
    }

    (output_dir / "field_validation.json").write_text(
        json.dumps(
            report,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return report
