from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool
    details: dict[str, Any] = Field(default_factory=dict)
    request_id: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


STANDARD_ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: {"model": ErrorResponse, "description": "Invalid request"},
    404: {"model": ErrorResponse, "description": "Resource not found"},
    422: {"model": ErrorResponse, "description": "Validation or domain constraint error"},
    500: {"model": ErrorResponse, "description": "Internal error"},
    502: {"model": ErrorResponse, "description": "External provider error"},
    503: {"model": ErrorResponse, "description": "Pipeline or data not ready"},
    504: {"model": ErrorResponse, "description": "Analysis or provider timeout"},
}
