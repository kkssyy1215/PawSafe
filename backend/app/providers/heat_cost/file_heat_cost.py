from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pandas as pd

from app.core.errors import (
    HeatDataNotAvailableError,
    InvalidDataFileError,
    StaleHeatDataError,
)
from app.providers.heat_cost.base import EdgeHeatRecord, HeatCostSnapshot


class FileHeatCostProvider:
    def __init__(self, path: Path, *, max_age_minutes: float) -> None:
        self.loaded = False
        self.data_version: str | None = None
        self._max_age = timedelta(minutes=max_age_minutes)
        try:
            rows, top_level_version = self._read_rows(path)
            records = [EdgeHeatRecord.model_validate(row) for row in rows]
            if not records:
                raise ValueError("empty heat file")
            identities = [(record.edge_id, record.valid_at) for record in records]
            if len(set(identities)) != len(identities):
                raise ValueError("duplicate edge_id/valid_at")
            if any(record.valid_at is None for record in records):
                raise ValueError("file-backed records require valid_at")
            versions = {record.data_version for record in records if record.data_version}
            if top_level_version:
                versions.add(str(top_level_version))
            if len(versions) > 1:
                raise ValueError("mixed data versions")
            self.data_version = next(iter(versions), None)
            self._records = records
            self.loaded = True
        except InvalidDataFileError:
            raise
        except Exception as exc:
            raise InvalidDataFileError("heat_cost") from exc

    @staticmethod
    def _read_rows(path: Path) -> tuple[list[dict[str, Any]], str | None]:
        if not path.is_file():
            raise InvalidDataFileError("heat_cost")
        if path.suffix.lower() == ".parquet":
            frame = pd.read_parquet(path)
            return frame.to_dict(orient="records"), frame.attrs.get("data_version")
        if path.suffix.lower() in {".json", ".geojson"}:
            payload = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(payload, list):
                return payload, None
            return payload["records"], payload.get("data_version")
        raise InvalidDataFileError("heat_cost")

    def get_snapshot(self, departure_at: datetime) -> HeatCostSnapshot:
        selected: dict[str, EdgeHeatRecord] = {}
        for record in self._records:
            current = selected.get(record.edge_id)
            if current is None or self._distance(record, departure_at) < self._distance(
                current, departure_at
            ):
                selected[record.edge_id] = record
        if not selected:
            raise HeatDataNotAvailableError()
        valid_times = [
            record.valid_at for record in selected.values() if record.valid_at is not None
        ]
        if not valid_times:
            raise HeatDataNotAvailableError()
        representative = max(valid_times)
        if any(abs(departure_at - valid_at) > self._max_age for valid_at in valid_times):
            raise StaleHeatDataError()
        return HeatCostSnapshot(
            records=selected,
            valid_at=representative,
            data_version=self.data_version,
            source="file",
            is_demo=False,
        )

    @staticmethod
    def _distance(record: EdgeHeatRecord, target: datetime) -> float:
        if record.valid_at is None:
            return float("inf")
        return abs((record.valid_at - target).total_seconds())
