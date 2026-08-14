from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from app.core.errors import (
    ExternalApiError,
    ExternalApiTimeoutError,
    InvalidResponseError,
    NetworkError,
    NoRouteError,
    NoWalkableNodeError,
    OutOfCoverageError,
    SameLocationError,
)
from app.providers.analysis.mock_analysis import MockAnalysisProvider
from app.schemas.common import WarningMessage
from app.schemas.geojson import LineStringGeometry
from app.schemas.route import RouteAnalysisRequest, RouteAnalysisResponse, RouteSummary

KAKAO_WALK_URL = "https://dapi.kakao.com/v2/routing/walk"


class KakaoWalkingAnalysisProvider:
    """Use Kakao's walking shortest route while retaining demo heat comparison data.

    Kakao supplies the live baseline geometry/distance. PawSafe heat metrics and
    the alternate route remain the deterministic MVP fixture until a graph and
    Edge x Time Heat Cost export are delivered by the data team.
    """

    def __init__(
        self,
        client: httpx.AsyncClient,
        *,
        api_key: str,
        mock_scenarios_path: Path,
        timeout_seconds: float,
    ) -> None:
        self._client = client
        self._headers = {"Authorization": f"KakaoAK {api_key}"}
        self._timeout = timeout_seconds
        self._mock = MockAnalysisProvider(mock_scenarios_path)

    async def analyze(self, request: RouteAnalysisRequest) -> RouteAnalysisResponse:
        demo = await self._mock.analyze(request)
        payload = await self._get_route(request)
        shortest = self._to_route_summary(payload, demo.shortest)
        pawsafe = demo.pawsafe.model_copy(update={"label": "PawSafe 추천 경로(데모)"})
        comparison = demo.comparison.model_copy(
            update={
                "distance_delta_m": pawsafe.distance_m - shortest.distance_m,
                "duration_delta_min": pawsafe.duration_min - shortest.duration_min,
            }
        )
        warnings = [
            *demo.warnings,
            WarningMessage(
                code="KAKAO_SHORTEST_WITH_DEMO_HEAT",
                message=(
                    "최단 경로 거리·선은 Kakao 도보 API 결과이며, "
                    "열환경 비교값은 MVP 예시 데이터입니다."
                ),
            ),
        ]
        return demo.model_copy(
            update={
                "analysis_id": self._analysis_id(request, shortest),
                "is_demo": True,
                "analysis_source": "kakao_walk+mock_heat_fixture",
                "validation_status": "not_validated",
                "generated_at": datetime.now(UTC),
                "graph_version": "kakao-walk",
                "heat_data_version": None,
                "shortest": shortest,
                "pawsafe": pawsafe,
                "comparison": comparison,
                "warnings": warnings,
            }
        )

    async def _get_route(self, request: RouteAnalysisRequest) -> dict[str, Any]:
        params = {
            "start_x": str(request.origin.lng),
            "start_y": str(request.origin.lat),
            "end_x": str(request.destination.lng),
            "end_y": str(request.destination.lat),
            "s_name": request.origin.name,
            "e_name": request.destination.name,
            "input_coord": "WGS84",
            "output_coord": "WGS84",
            "route_mode": "SHORTEST",
        }
        try:
            response = await self._client.get(
                KAKAO_WALK_URL,
                headers=self._headers,
                params=params,
                timeout=self._timeout,
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.TimeoutException as exc:
            raise ExternalApiTimeoutError() from exc
        except httpx.ConnectError as exc:
            raise NetworkError() from exc
        except httpx.HTTPError as exc:
            raise ExternalApiError() from exc
        except ValueError as exc:
            raise InvalidResponseError() from exc

        if not isinstance(payload, dict):
            raise InvalidResponseError()
        status = payload.get("status")
        if status != "OK":
            self._raise_route_status(status)
        route = payload.get("route")
        if not isinstance(route, dict):
            raise InvalidResponseError()
        return route

    @staticmethod
    def _raise_route_status(status: object) -> None:
        if status == "SAME_POINT":
            raise SameLocationError()
        if status in {"START_LINK_NOT_FOUND", "END_LINK_NOT_FOUND"}:
            raise NoWalkableNodeError()
        if status == "TOO_FAR_AWAY":
            raise OutOfCoverageError()
        if status == "ROUTE_RESULT_NOT_FOUND":
            raise NoRouteError()
        raise InvalidResponseError()

    @staticmethod
    def _to_route_summary(route: dict[str, Any], demo: RouteSummary) -> RouteSummary:
        properties = route.get("properties")
        if not isinstance(properties, dict):
            raise InvalidResponseError()
        try:
            distance_m = int(properties["totalDistance"])
            duration_min = max(1, round(int(properties["totalTime"]) / 60))
        except (KeyError, TypeError, ValueError) as exc:
            raise InvalidResponseError() from exc

        coordinates: list[tuple[float, float]] = []
        legs = route.get("legs", [])
        if not isinstance(legs, list):
            raise InvalidResponseError()
        for leg in legs:
            if not isinstance(leg, dict):
                raise InvalidResponseError()
            steps = leg.get("steps", [])
            if not isinstance(steps, list):
                raise InvalidResponseError()
            for step in steps:
                if not isinstance(step, dict):
                    raise InvalidResponseError()
                path = step.get("path")
                points = path.get("points", []) if isinstance(path, dict) else []
                if not isinstance(points, list):
                    raise InvalidResponseError()
                for point in points:
                    if not isinstance(point, list) or len(point) < 2:
                        raise InvalidResponseError()
                    try:
                        coordinate = (float(point[0]), float(point[1]))
                    except (TypeError, ValueError) as exc:
                        raise InvalidResponseError() from exc
                    if not coordinates or coordinates[-1] != coordinate:
                        coordinates.append(coordinate)

        if len(coordinates) < 2:
            raise InvalidResponseError()
        return demo.model_copy(
            update={
                "route_id": "kakao_shortest",
                "label": "카카오 최단 보행 경로",
                "route_source": "kakao_walk",
                "geometry": LineStringGeometry(coordinates=coordinates),
                "distance_m": distance_m,
                "duration_min": duration_min,
                "edge_count": max(0, len(coordinates) - 1),
            }
        )

    @staticmethod
    def _analysis_id(request: RouteAnalysisRequest, shortest: RouteSummary) -> str:
        digest_payload = (
            f"{request.origin.id}|{request.destination.id}|{request.departure_at.isoformat()}|"
            f"{shortest.distance_m}|{shortest.duration_min}"
        )
        digest = hashlib.sha256(digest_payload.encode("utf-8")).hexdigest()[:12]
        return f"kakao_walk_{digest}"
