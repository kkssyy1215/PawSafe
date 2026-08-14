from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from app.core.errors import InvalidDataFileError
from app.providers.heat_cost.base import EdgeHeatRecord, HeatCostSnapshot
from app.schemas.common import WarningMessage


class MockHeatCostProvider:
    def __init__(self, path: Path) -> None:
        self.loaded = False
        self.data_version: str | None = None
        self._records: dict[str, EdgeHeatRecord] = {}
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            records = [EdgeHeatRecord.model_validate(item) for item in payload["records"]]
            if len({record.edge_id for record in records}) != len(records):
                raise ValueError("duplicate edge_id")
            self._records = {record.edge_id: record for record in records}
            self.data_version = payload.get("data_version")
            self.loaded = True
        except Exception as exc:
            raise InvalidDataFileError("heat_cost") from exc

    def get_snapshot(self, departure_at: datetime) -> HeatCostSnapshot:
        del departure_at
        return HeatCostSnapshot(
            records=self._records,
            valid_at=None,
            data_version=self.data_version,
            source="mock_fixture",
            is_demo=True,
            warnings=[
                WarningMessage(
                    code="DEMO_HEAT_COST",
                    message="Heat Cost는 실측 검증 전인 MVP 예시 데이터입니다.",
                )
            ],
        )
