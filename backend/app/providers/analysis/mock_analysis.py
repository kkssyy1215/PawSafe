from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.errors import AnalysisTimeoutError, InvalidDataFileError, NoRouteError
from app.schemas.route import RouteAnalysisRequest, RouteAnalysisResponse


class MockAnalysisProvider:
    """Deterministic fixture provider; it never synthesizes Heat Cost values."""

    def __init__(self, path: Path) -> None:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            self._scenarios: dict[str, dict[str, Any]] = payload["scenarios"]
            required = {"cool", "fast", "same_route", "no_improvement"}
            if not required.issubset(self._scenarios):
                raise ValueError("missing mock scenario")
        except Exception as exc:
            raise InvalidDataFileError("mock_scenarios") from exc

    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        ids = {request.origin.id, request.destination.id}
        if "scenario_timeout" in ids:
            raise AnalysisTimeoutError()
        if "scenario_no_route" in ids:
            raise NoRouteError()
        if "scenario_same_route" in ids:
            scenario_name = "same_route"
        elif "scenario_no_improvement" in ids:
            scenario_name = "no_improvement"
        else:
            scenario_name = request.walk_mode
        payload = dict(self._scenarios[scenario_name])
        payload["requested_departure_at"] = request.departure_at
        payload["analysis_id"] = f"demo_analysis_{scenario_name}"
        return RouteAnalysisResponse.model_validate(payload)
