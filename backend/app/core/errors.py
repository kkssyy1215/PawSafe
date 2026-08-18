from __future__ import annotations

from collections.abc import Mapping
from typing import Any


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 400,
        retryable: bool = False,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retryable = retryable
        self.details = dict(details or {})


class OutOfCoverageError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "OUT_OF_COVERAGE",
            "현재 온:길 분석 범위를 벗어난 위치입니다.",
            status_code=422,
        )


class SameLocationError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "SAME_LOCATION",
            "출발지와 목적지가 너무 가깝습니다.",
            status_code=422,
        )


class NoWalkableNodeError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "NO_WALKABLE_NODE",
            "입력 위치 근처에서 연결 가능한 보행로를 찾지 못했습니다.",
            status_code=422,
        )


class NoRouteError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "NO_ROUTE",
            "두 위치를 잇는 보행 경로를 찾지 못했습니다.",
            status_code=422,
        )


class HeatDataNotAvailableError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "HEAT_DATA_NOT_AVAILABLE",
            "선택한 조건에 사용할 Heat Cost 데이터가 없습니다.",
            status_code=503,
            retryable=True,
        )


class StaleHeatDataError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "STALE_HEAT_DATA",
            "선택한 조건에 사용할 최신 Heat Cost 데이터가 없습니다.",
            status_code=503,
            retryable=True,
        )


class AnalysisTimeoutError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "ANALYSIS_TIMEOUT",
            "경로 분석 시간이 초과되었습니다.",
            status_code=504,
            retryable=True,
        )


class ExternalApiTimeoutError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "EXTERNAL_API_TIMEOUT",
            "외부 서비스 응답 시간이 초과되었습니다.",
            status_code=504,
            retryable=True,
        )


class ExternalApiError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "EXTERNAL_API_ERROR",
            "외부 서비스 연결에 실패했습니다.",
            status_code=502,
            retryable=True,
        )


class NetworkError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "NETWORK_ERROR",
            "외부 서비스에 연결할 수 없습니다.",
            status_code=502,
            retryable=True,
        )


class InvalidResponseError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "INVALID_RESPONSE",
            "외부 서비스 응답 형식이 올바르지 않습니다.",
            status_code=502,
            retryable=True,
        )


class ModelNotReadyError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "MODEL_NOT_READY",
            "Heat Cost 모델 결과가 아직 준비되지 않았습니다.",
            status_code=503,
            retryable=True,
        )


class PipelineNotReadyError(AppError):
    def __init__(self, component: str = "analysis") -> None:
        super().__init__(
            "PIPELINE_NOT_READY",
            "경로 분석 파이프라인이 아직 준비되지 않았습니다.",
            status_code=503,
            retryable=True,
            details={"component": component},
        )


class InvalidDataFileError(AppError):
    def __init__(self, data_type: str) -> None:
        super().__init__(
            "INVALID_DATA_FILE",
            "분석 데이터 파일을 읽을 수 없습니다.",
            status_code=503,
            retryable=False,
            details={"data_type": data_type},
        )


class PlaceNotFoundError(AppError):
    def __init__(self) -> None:
        super().__init__("PLACE_NOT_FOUND", "장소를 찾지 못했습니다.", status_code=404)
