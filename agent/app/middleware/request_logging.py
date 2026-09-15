"""入站 HTTP 请求链路日志与结构化 Trace Event。"""
from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable
from typing import Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging_config import set_trace_id, truncate_text
from app.observability.runtime_trace import runtime_trace_recorder
from app.schemas.trace import TraceEventStatus

logger = logging.getLogger("app.http")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *, log_http_bodies: bool = False) -> None:
        super().__init__(app)
        self.log_http_bodies = log_http_bodies

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        trace_id = request.headers.get("x-trace-id") or uuid.uuid4().hex
        set_trace_id(trace_id)

        client_host = request.client.host if request.client else "-"
        query = str(request.url.query) if request.url.query else ""
        started = time.perf_counter()

        body_bytes = b""
        if self.log_http_bodies and request.method in {"POST", "PUT", "PATCH"}:
            body_bytes = await request.body()

            async def receive() -> dict[str, Any]:
                return {"type": "http.request", "body": body_bytes, "more_body": False}

            request = Request(request.scope, receive)

        logger.info(
            "→ %s %s client=%s query=%s",
            request.method,
            request.url.path,
            client_host,
            query or "-",
        )
        if body_bytes:
            logger.debug("request body: %s", truncate_text(body_bytes.decode("utf-8", errors="replace")))

        response: Response | None = None
        caught_error: BaseException | None = None
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            caught_error = exc
            logger.exception("← %s %s unhandled exception", request.method, request.url.path)
            raise
        finally:
            elapsed_ms = (time.perf_counter() - started) * 1000
            status = response.status_code if response is not None else 500
            logger.info(
                "← %s %s status=%s duration=%.1fms",
                request.method,
                request.url.path,
                status,
                elapsed_ms,
            )
            runtime_trace_recorder.record_event(
                component="http",
                operation=f"{request.method} {request.url.path}",
                status=(TraceEventStatus.ERROR if status >= 400 else TraceEventStatus.SUCCESS),
                duration_ms=elapsed_ms,
                attributes={"statusCode": status},
                error=caught_error,
                trace_id=trace_id,
            )
            if response is not None:
                response.headers["x-trace-id"] = trace_id
