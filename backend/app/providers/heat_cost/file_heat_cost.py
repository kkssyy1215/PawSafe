from __future__ import annotations

import json
import math
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, cast
from zoneinfo import ZoneInfo

import pandas as pd

from app.core.errors import (
    HeatDataNotAvailableError,
    InvalidDataFileError,
    StaleHeatDataError,
)
from app.providers.heat_cost.base import EdgeHeatRecord, HeatCostSnapshot
from app.schemas.common import WarningMessage


class FileHeatCostProvider:
    def __init__(
        self,
        path: Path,
        *,
        max_age_minutes: float,
        data_version_override: str | None = None,
        timezone_name: str = "Asia/Seoul",
    ) -> None:
        self.loaded = False
        self.data_version: str | None = None
        self._max_age = timedelta(minutes=max_age_minutes)
        self._source = "file"
        self._path = path
        self._data_version_override = data_version_override
        self._timezone_name = timezone_name
        self._lock = threading.Lock()
        self._modified_ns = -1
        try:
            rows, top_level_version = self._read_rows(path)
            is_pipeline = self._looks_like_pipeline(rows)
            if is_pipeline:
                rows = self._normalize_pipeline_rows(
                    rows,
                    timezone_name=timezone_name,
                    data_version=data_version_override or top_level_version or path.stem,
                )
                self._source = "pipeline_file"
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
            self.data_version = data_version_override or next(iter(versions), None)
            self._records = records
            self.loaded = True
            self._modified_ns = path.stat().st_mtime_ns
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
        self._reload_if_changed()
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
            source=self._source,
            warnings=(
                [
                    WarningMessage(
                        code="PIPELINE_RELATIVE_HEAT",
                        message=(
                            "데이터팀 파이프라인의 Heat Cost는 상대 열노출 지표이며 "
                            "실측 노면온도나 절대 안전 판정이 아닙니다."
                        ),
                    )
                ]
                if self._source == "pipeline_file"
                else []
            ),
        )

    def _reload_if_changed(self) -> None:
        try:
            modified_ns = self._path.stat().st_mtime_ns
        except OSError as exc:
            raise InvalidDataFileError("heat_cost") from exc
        if modified_ns == self._modified_ns:
            return
        with self._lock:
            if self._path.stat().st_mtime_ns == self._modified_ns:
                return
            fresh = type(self)(
                self._path,
                max_age_minutes=self._max_age.total_seconds() / 60,
                data_version_override=self._data_version_override,
                timezone_name=self._timezone_name,
            )
            self.data_version = fresh.data_version
            self._source = fresh._source
            self._records = fresh._records
            self._modified_ns = fresh._modified_ns
            self.loaded = fresh.loaded

    @staticmethod
    def _looks_like_pipeline(rows: list[dict[str, Any]]) -> bool:
        if not rows:
            return False
        return any("timestamp" in row for row in rows) and any(
            key in rows[0] for key in ("heat_cost", "heat_cost_continuous", "heat_cost_100")
        )

    @classmethod
    def _normalize_pipeline_rows(
        cls,
        rows: list[dict[str, Any]],
        *,
        timezone_name: str,
        data_version: str,
    ) -> list[dict[str, Any]]:
        timezone = ZoneInfo(timezone_name)
        normalized: list[dict[str, Any]] = []
        for row in rows:
            edge_id = cls._required_text(row.get("edge_id"))
            heat_value = cls._number(
                row.get("heat_cost", row.get("heat_cost_continuous", row.get("heat_cost_100")))
            )
            if edge_id is None or heat_value is None:
                raise ValueError("pipeline heat rows require edge_id and heat_cost")
            timestamp = row.get("timestamp", row.get("valid_at"))
            if timestamp is None:
                raise ValueError("pipeline heat rows require timestamp")
            valid_at = cls._parse_datetime(timestamp, timezone)
            normalized.append(
                {
                    "edge_id": edge_id,
                    # Pipeline heat is keyed by the source edge ID. Graph adapters
                    # attach this ID to every split segment and do not use these node IDs.
                    "from_node": f"pipeline:{edge_id}:from",
                    "to_node": f"pipeline:{edge_id}:to",
                    "valid_at": valid_at,
                    "heat_cost": heat_value,
                    "shade_ratio": cls._number(row.get("shade_ratio")),
                    "direct_sun_minutes": cls._number(
                        row.get("direct_sun_minutes", row.get("recent_direct_sun_minutes"))
                    ),
                    "surface_type": cls._required_text(
                        row.get("surface_type", row.get("surface_code"))
                    )
                    or "unknown",
                    "confidence": cls._number(row.get("confidence")),
                    "validation_status": "not_validated",
                    "data_version": data_version,
                }
            )
        return normalized

    @staticmethod
    def _required_text(value: Any) -> str | None:
        value = FileHeatCostProvider._none_if_nan(value)
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @staticmethod
    def _number(value: Any) -> float | None:
        value = FileHeatCostProvider._none_if_nan(value)
        if value is None:
            return None
        return float(value)

    @staticmethod
    def _none_if_nan(value: Any) -> Any:
        if value is None:
            return None
        try:
            return None if math.isnan(float(value)) else value
        except (TypeError, ValueError):
            return value

    @staticmethod
    def _parse_datetime(value: Any, timezone: ZoneInfo) -> datetime:
        if hasattr(value, "to_pydatetime"):
            converted = value.to_pydatetime()
            parsed = cast(datetime, converted)
        elif isinstance(value, datetime):
            parsed = value
        else:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None or parsed.utcoffset() is None:
            return parsed.replace(tzinfo=timezone)
        return parsed

    @staticmethod
    def _distance(record: EdgeHeatRecord, target: datetime) -> float:
        if record.valid_at is None:
            return float("inf")
        return abs((record.valid_at - target).total_seconds())
