"""Agent 统一日志：traceId 透传、敏感字段脱敏、DEBUG 请求体输出。"""
from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar
from typing import Any

trace_id_var: ContextVar[str] = ContextVar("trace_id", default="-")


class TraceIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.trace_id = trace_id_var.get()
        return True


def configure_logging(level: str) -> None:
    log_level = getattr(logging, level.upper(), logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [trace=%(trace_id)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(TraceIdFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(log_level)

    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "httpx", "httpcore"):
        named = logging.getLogger(logger_name)
        named.handlers.clear()
        named.propagate = True
        named.setLevel(log_level)


def set_trace_id(trace_id: str) -> None:
    trace_id_var.set(trace_id or "-")


def get_trace_id() -> str:
    value = trace_id_var.get()
    return value if value and value != "-" else "-"


def mask_secret(value: str | None, *, visible_tail: int = 4) -> str:
    if not value:
        return "<empty>"
    trimmed = value.strip()
    if len(trimmed) <= visible_tail:
        return "*" * len(trimmed)
    return f"{'*' * (len(trimmed) - visible_tail)}{trimmed[-visible_tail:]}"


def truncate_text(value: str, max_len: int = 4000) -> str:
    if len(value) <= max_len:
        return value
    return f"{value[:max_len]}…(+{len(value) - max_len} chars)"


def safe_json(value: Any, *, max_len: int = 4000) -> str:
    try:
        text = json.dumps(value, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        text = str(value)
    return truncate_text(text, max_len)


def summarize_chat_messages(messages: list[dict[str, Any]], *, preview_chars: int = 120) -> list[dict[str, Any]]:
    summarized: list[dict[str, Any]] = []
    for message in messages:
        role = str(message.get("role", ""))
        content = message.get("content", "")
        if isinstance(content, str):
            content_preview = truncate_text(content, preview_chars)
            content_len = len(content)
        else:
            content_preview = truncate_text(safe_json(content, max_len=preview_chars), preview_chars)
            content_len = len(content_preview)
        summarized.append({"role": role, "contentLen": content_len, "preview": content_preview})
    return summarized
