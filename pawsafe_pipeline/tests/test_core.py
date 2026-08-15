import json
from pathlib import Path

import numpy as np
import pandas as pd
import networkx as nx
from shapely.geometry import LineString

from src.pawsafe.features import build_edge_time_features
from src.pawsafe.live_update import append_weather_csv, build_live_features
from src.pawsafe.routing import route
from src.pawsafe.utils import minmax


def test_minmax():
    assert minmax(pd.Series([1, 2, 3])).tolist() == [0, 50, 100]


def test_sun_and_storage_increase():
    edges = pd.DataFrame({"edge_id":["E1"], "length_m":[100], "surface_code":["SWB005"], "surface_absorptivity":[0.88]})
    ts = pd.date_range("2026-08-01 12:00", periods=3, freq="h")
    shadows = pd.DataFrame({"edge_id":["E1"]*3, "timestamp":ts, "shade_ratio":[0,0,0]})
    weather = pd.DataFrame({"timestamp":ts, "solar_radiation_mj_m2":[2,2,2], "air_temperature_c":[33]*3, "humidity_pct":[60]*3, "wind_speed_ms":[1]*3, "rainfall_mm":[0]*3})
    cfg={"time":{"shadow_interval_minutes":60,"recent_sun_window_hours":3,"cumulative_window_hours":6},"heat":{"thermal_memory_hours":2.5,"wind_cooling_factor":.12,"rain_cooling_factor":.35}}
    out=build_edge_time_features(edges, shadows, weather, cfg)
    assert out.heat_storage_proxy.is_monotonic_increasing
    assert out.recent_direct_sun_minutes.iloc[-1] == 180


def test_route_modes_are_fast_and_cool_only():
    root = Path(__file__).resolve().parents[1]
    config = json.loads((root / "config.json").read_text(encoding="utf-8"))

    assert list(config["routing"]["modes"]) == ["fast", "cool"]


def test_revised_surface_absorptivity_file_is_configured():
    root = Path(__file__).resolve().parents[1]
    config = json.loads((root / "config.json").read_text(encoding="utf-8"))

    revised = root / config["files"]["surface_absorptivity_revised"]
    assert revised.is_file()
    assert config["heat"]["surface_absorptivity"]["unknown"] == 0.731834
    assert config["heat"]["surface_absorptivity"]["SWB005"] == 0.915
    assert config["files"]["edge_time_features_source"].endswith(
        "edge_time_features_absorptivity_updated_v2.csv"
    )


def test_route_geometry_is_oriented_and_connected():
    graph = nx.MultiGraph()
    graph.add_edge(
        (0.0, 0.0),
        (1.0, 0.0),
        edge_id="E1",
        length_m=1.0,
        geometry=LineString([(1.1, 0.0), (0.0, 0.0)]),
    )
    graph.add_edge(
        (1.0, 0.0),
        (2.0, 0.0),
        edge_id="E2",
        length_m=1.0,
        geometry=LineString([(2.0, 0.0), (0.9, 0.0)]),
    )

    result = route(
        graph,
        (0.0, 0.0),
        (2.0, 0.0),
        {"E1": 50, "E2": 50},
        heat_weight=0,
    )

    assert list(result["geometry"].coords) == [
        (0.0, 0.0),
        (1.0, 0.0),
        (2.0, 0.0),
    ]


def test_weather_csv_deduplicates_observation_time(tmp_path):
    path = tmp_path / "kma_weather.csv"
    payload = {
        "observed_at": "2026-08-15T13:00:00+09:00",
        "temperature_c": 29.0,
        "humidity_pct": 70.0,
        "wind_speed_ms": 1.1,
        "rainfall_mm": 0.0,
        "grid_x": 62,
        "grid_y": 126,
        "source": "KMA_ULTRA_SHORT_NOWCAST",
    }
    append_weather_csv(payload, path)
    payload["temperature_c"] = 30.0
    result = append_weather_csv(payload, path)

    assert len(result) == 1
    assert result.iloc[0]["temperature_c"] == 30.0


def test_live_features_replace_only_weather_and_timestamp():
    historical = pd.DataFrame(
        {
            "edge_id": ["E1", "E1"],
            "timestamp": pd.to_datetime(["2026-08-08 12:00", "2026-08-08 13:00"]),
            "heat_storage_proxy": [1.0, 2.0],
            "effective_solar_mj_m2": [0.5, 0.8],
            "shade_ratio": [0.2, 0.3],
            "air_temperature_c": [33.0, 34.0],
            "humidity_pct": [60.0, 61.0],
            "wind_speed_ms": [2.0, 2.1],
            "rainfall_mm": [0.0, 0.0],
        }
    )
    cfg = {
        "time": {"shadow_interval_minutes": 60},
        "heat": {
            "thermal_memory_hours": 2.5,
            "wind_cooling_factor": 0.12,
            "rain_cooling_factor": 0.35,
        },
    }
    weather = {
        "observed_at": "2026-08-15T13:00:00+09:00",
        "temperature_c": 29.0,
        "humidity_pct": 70.0,
        "wind_speed_ms": 1.1,
        "rainfall_mm": 0.0,
        "source": "KMA_ULTRA_SHORT_NOWCAST",
    }

    result = build_live_features(historical, weather, cfg)

    assert result.iloc[0]["air_temperature_c"] == 29.0
    assert result.iloc[0]["humidity_pct"] == 70.0
    assert result.iloc[0]["shade_ratio"] == 0.3
    assert result.iloc[0]["solar_source"] == "ASOS_HISTORICAL_HOUR_TEMPLATE"
