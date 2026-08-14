from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pytest

from app.core.errors import InvalidDataFileError, StaleHeatDataError
from app.providers.heat_cost.file_heat_cost import FileHeatCostProvider


def _write(path: Path, valid_at: str) -> None:
    path.write_text(
        json.dumps(
            {
                "data_version": "v1",
                "records": [
                    {
                        "edge_id": "e1",
                        "from_node": "a",
                        "to_node": "b",
                        "valid_at": valid_at,
                        "heat_cost": 50,
                        "shade_ratio": None,
                        "direct_sun_minutes": None,
                        "surface_type": "unknown",
                        "confidence": None,
                        "validation_status": "not_validated",
                        "data_version": "v1",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )


def test_file_provider_selects_time_aware_snapshot(tmp_path: Path) -> None:
    path = tmp_path / "heat.json"
    _write(path, "2026-08-12T18:30:00+09:00")
    provider = FileHeatCostProvider(path, max_age_minutes=120)
    snapshot = provider.get_snapshot(datetime.fromisoformat("2026-08-12T19:00:00+09:00"))
    assert snapshot.records["e1"].heat_cost == 50
    assert snapshot.data_version == "v1"


def test_file_provider_rejects_stale_data(tmp_path: Path) -> None:
    path = tmp_path / "heat.json"
    _write(path, "2026-08-12T10:00:00+09:00")
    provider = FileHeatCostProvider(path, max_age_minutes=120)
    with pytest.raises(StaleHeatDataError):
        provider.get_snapshot(datetime.fromisoformat("2026-08-12T19:00:00+09:00"))


def test_file_provider_rejects_naive_valid_at(tmp_path: Path) -> None:
    path = tmp_path / "heat.json"
    _write(path, "2026-08-12T10:00:00")
    with pytest.raises(InvalidDataFileError):
        FileHeatCostProvider(path, max_age_minutes=120)
