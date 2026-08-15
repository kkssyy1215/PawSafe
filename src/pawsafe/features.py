from __future__ import annotations

import numpy as np
import pandas as pd


def build_edge_time_features(
    edges, shadows: pd.DataFrame, weather: pd.DataFrame, cfg: dict
) -> pd.DataFrame:
    df = (
        shadows.merge(weather, on="timestamp", how="left")
        .merge(
            edges[["edge_id", "length_m", "surface_code", "surface_absorptivity"]],
            on="edge_id",
            how="left",
        )
        .sort_values(["edge_id", "timestamp"])
    )
    df["sun_fraction"] = (1 - df["shade_ratio"]).clip(0, 1)
    df["effective_solar_mj_m2"] = (
        df["solar_radiation_mj_m2"] * df["sun_fraction"] * df["surface_absorptivity"]
    )
    dt_min = cfg["time"]["shadow_interval_minutes"]
    recent_n = max(1, round(cfg["time"]["recent_sun_window_hours"] * 60 / dt_min))
    cumulative_n = max(1, round(cfg["time"]["cumulative_window_hours"] * 60 / dt_min))
    g = df.groupby("edge_id", group_keys=False)
    df["recent_direct_sun_minutes"] = (
        g["sun_fraction"]
        .rolling(recent_n, min_periods=1)
        .sum()
        .reset_index(level=0, drop=True)
        * dt_min
    )
    df["cumulative_effective_solar_mj_m2"] = (
        g["effective_solar_mj_m2"]
        .rolling(cumulative_n, min_periods=1)
        .sum()
        .reset_index(level=0, drop=True)
    )

    # Newton-cooling-inspired first-order heat-storage proxy; not a Celsius prediction.
    tau = cfg["heat"]["thermal_memory_hours"]
    base_decay = np.exp(-(dt_min / 60) / tau)
    wind_factor = cfg["heat"]["wind_cooling_factor"]
    rain_factor = cfg["heat"]["rain_cooling_factor"]
    states = np.zeros(len(df))
    for _, idx in df.groupby("edge_id", sort=False).groups.items():
        h = 0.0
        for i in idx:
            wind = max(0, float(df.at[i, "wind_speed_ms"] or 0))
            rain = max(0, float(df.at[i, "rainfall_mm"] or 0))
            decay = base_decay ** (1 + wind_factor * wind + rain_factor * rain)
            h = h * decay + float(df.at[i, "effective_solar_mj_m2"])
            states[i] = h
    df["heat_storage_proxy"] = states
    return df.reset_index(drop=True)


def recompute_derived_features(features: pd.DataFrame, cfg: dict) -> pd.DataFrame:
    """흡수율이 바뀐 기존 Edge×시간 표의 파생 피처를 다시 계산한다."""
    df = features.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["edge_id", "timestamp"]).reset_index(drop=True)
    df["surface_absorptivity"] = pd.to_numeric(
        df["surface_absorptivity"], errors="coerce"
    ).fillna(cfg["heat"]["surface_absorptivity"]["unknown"])
    df["solar_radiation_mj_m2"] = (
        pd.to_numeric(df["solar_radiation_mj_m2"], errors="coerce")
        .fillna(0)
        .clip(lower=0)
    )
    df["sun_fraction"] = (1 - df["shade_ratio"]).clip(0, 1)
    df["effective_solar_mj_m2"] = (
        df["solar_radiation_mj_m2"] * df["sun_fraction"] * df["surface_absorptivity"]
    )

    dt_min = cfg["time"]["shadow_interval_minutes"]
    recent_n = max(1, round(cfg["time"]["recent_sun_window_hours"] * 60 / dt_min))
    cumulative_n = max(1, round(cfg["time"]["cumulative_window_hours"] * 60 / dt_min))
    grouped = df.groupby("edge_id", group_keys=False)
    df["recent_direct_sun_minutes"] = (
        grouped["sun_fraction"]
        .rolling(recent_n, min_periods=1)
        .sum()
        .reset_index(level=0, drop=True)
        * dt_min
    )
    df["cumulative_effective_solar_mj_m2"] = (
        grouped["effective_solar_mj_m2"]
        .rolling(cumulative_n, min_periods=1)
        .sum()
        .reset_index(level=0, drop=True)
    )

    tau = cfg["heat"]["thermal_memory_hours"]
    base_decay = np.exp(-(dt_min / 60) / tau)
    wind_factor = cfg["heat"]["wind_cooling_factor"]
    rain_factor = cfg["heat"]["rain_cooling_factor"]
    wind = pd.to_numeric(df["wind_speed_ms"], errors="coerce").fillna(0).clip(lower=0)
    rain = pd.to_numeric(df["rainfall_mm"], errors="coerce").fillna(0).clip(lower=0)
    states = np.zeros(len(df))
    for _, indices in df.groupby("edge_id", sort=False).groups.items():
        state = 0.0
        for index in indices:
            decay = base_decay ** (
                1 + wind_factor * wind.iloc[index] + rain_factor * rain.iloc[index]
            )
            state = state * decay + float(df.at[index, "effective_solar_mj_m2"])
            states[index] = state
    df["heat_storage_proxy"] = states
    return df
