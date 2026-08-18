from __future__ import annotations

import pandas as pd
import pytest

from app.model_runtime.pawsafe_12day import asos_live


def _weather(start: str, periods: int) -> pd.DataFrame:
    timestamps = pd.date_range(start, periods=periods, freq="h")
    return pd.DataFrame(
        {
            "timestamp": timestamps,
            "air_temperature_c": range(periods),
            "humidity_pct": [60.0] * periods,
            "wind_speed_ms": [1.0] * periods,
            "rainfall_mm": [0.0] * periods,
            "solar_radiation_mj_m2": [1.5] * periods,
            "sunshine_hours": [1.0] * periods,
        }
    )


def test_latest_asos_selects_latest_complete_service_window(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    received = _weather("2026-08-16 00:00", 46)
    captured: dict[str, pd.Timestamp] = {}

    def fake_fetch(start: pd.Timestamp, end: pd.Timestamp, **_: object) -> pd.DataFrame:
        captured["start"] = start
        captured["end"] = end
        return received

    monkeypatch.setattr(asos_live, "fetch_asos_range", fake_fetch)

    window, target = asos_live.fetch_asos_inference_window(
        service_key="test-key",
        mode="latest",
        now=pd.Timestamp("2026-08-18 17:30"),
    )

    assert target == pd.Timestamp("2026-08-17 21:00")
    assert len(window) == 13
    assert window["timestamp"].iloc[0] == pd.Timestamp("2026-08-17 09:00")
    assert captured["end"] == pd.Timestamp("2026-08-17 23:00")


def test_fixed_asos_uses_august_15_1600_window(monkeypatch: pytest.MonkeyPatch) -> None:
    received = _weather("2026-08-15 04:00", 13)
    monkeypatch.setattr(asos_live, "fetch_asos_range", lambda *args, **kwargs: received)

    window, target = asos_live.fetch_asos_inference_window(
        service_key="test-key",
        mode="fixed",
        fixed_timestamp="2026-08-15T16:00:00",
    )

    assert target == pd.Timestamp("2026-08-15 16:00")
    assert len(window) == 13
    assert window["timestamp"].iloc[0] == pd.Timestamp("2026-08-15 04:00")
