from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.core.errors import AppError
from app.core.logging import get_logger
from app.core.request_id import current_request_id


def _safe_validation_details(exc: RequestValidationError | ValidationError) -> dict[str, Any]:
    fields: list[dict[str, Any]] = []
    for error in exc.errors():
        location = [str(item) for item in error.get("loc", ()) if item not in {"body", "query"}]
        fields.append(
            {
                "field": ".".join(location) or "request",
                "type": str(error.get("type", "invalid")),
            }
        )
    return {"fields": fields}


def _response(
    *,
    status_code: int,
    code: str,
    message: str,
    retryable: bool,
    details: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "retryable": retryable,
                "details": details or {},
                "request_id": request_id or current_request_id(),
            }
        },
    )


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return _response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            retryable=exc.retryable,
            details=exc.details,
            request_id=request.state.request_id,
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return _response(
            status_code=422,
            code="VALIDATION_ERROR",
            message="요청 형식이 올바르지 않습니다.",
            retryable=False,
            details=_safe_validation_details(exc),
            request_id=request.state.request_id,
        )

    @app.exception_handler(ValidationError)
    async def response_validation_handler(
        request: Request,
        exc: ValidationError,
    ) -> JSONResponse:
        get_logger().error(
            "response_validation_failed",
            request_id=request.state.request_id,
            endpoint=request.url.path,
            error_count=exc.error_count(),
        )
        return _response(
            status_code=500,
            code="INTERNAL_ERROR",
            message="요청을 처리하지 못했습니다.",
            retryable=True,
            request_id=request.state.request_id,
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
        get_logger().exception(
            "unhandled_exception",
            request_id=request.state.request_id,
            endpoint=request.url.path,
            error_type=type(exc).__name__,
        )
        return _response(
            status_code=500,
            code="INTERNAL_ERROR",
            message="요청을 처리하지 못했습니다.",
            retryable=True,
            request_id=request.state.request_id,
        )
