"""Structured trace recorder with bounded memory and optional JSONL persistence."""
from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from collections import deque
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol

from app.core.logging_config import get_trace_id, truncate_text
from app.schemas.trace import TraceEvent, TraceEventStatus

logger = logging.getLogger(__name__)


class TraceSink(Protocol):
    def write(self, event: TraceEvent) -> None: ...


class InMemoryTraceSink:
    """Thread-safe bounded event store used for local inspection and tests."""

    def __init__(self, *, max_events: int = 2000) -> None:
        if max_events < 1:
            raise ValueError("max_events must be >= 1")
        self._events: deque[TraceEvent] = deque(maxlen=max_events)
        self._lock = threading.Lock()

    def write(self, event: TraceEvent) -> None:
        with self._lock:
            self._events.append(event)

    def find_by_trace(self, trace_id: str) -> list[TraceEvent]:
        with self._lock:
            return [event for event in self._events if event.trace_id == trace_id]

    def snapshot(self) -> list[TraceEvent]:
        with self._lock:
            return list(self._events)


class JsonlTraceSink:
    """Append-only JSONL sink.  No prompt body or secret is added automatically."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self._lock = threading.Lock()

    def write(self, event: TraceEvent) -> None:
        payload = event.model_dump(by_alias=True, mode="json")
        line = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")


class CompositeTraceSink:
    """Fan out events to multiple sinks without letting telemetry break business flow."""

    def __init__(self, sinks: list[TraceSink]) -> None:
        self.sinks = list(sinks)

    def write(self, event: TraceEvent) -> None:
        for sink in self.sinks:
            try:
                sink.write(event)
            except Exception:
                logger.exception("trace sink write failed sink=%s", type(sink).__name__)


class TraceRecorder:
    def __init__(self, sink: TraceSink) -> None:
        self.sink = sink

    def record_event(
        self,
        *,
        component: str,
        operation: str,
        status: TraceEventStatus,
        duration_ms: float | None = None,
        attributes: dict[str, Any] | None = None,
        error: BaseException | None = None,
        trace_id: str | None = None,
        parent_event_id: str | None = None,
        event_id: str | None = None,
    ) -> TraceEvent:
        resolved_trace_id = trace_id or get_trace_id()
        event = TraceEvent(
            trace_id=resolved_trace_id,
            event_id=event_id or uuid.uuid4().hex,
            parent_event_id=parent_event_id,
            component=component,
            operation=operation,
            status=status,
            occurred_at=datetime.now(timezone.utc),
            duration_ms=round(duration_ms, 3) if duration_ms is not None else None,
            attributes=dict(attributes or {}),
            error_type=type(error).__name__ if error is not None else None,
            error_message=(truncate_text(str(error), 1000) if error is not None else None),
        )
        try:
            self.sink.write(event)
        except Exception:
            logger.exception("trace recorder write failed")
        return event

    @contextmanager
    def span(
        self,
        *,
        component: str,
        operation: str,
        attributes: dict[str, Any] | None = None,
        trace_id: str | None = None,
        parent_event_id: str | None = None,
    ) -> Iterator[str]:
        event_id = uuid.uuid4().hex
        started = time.perf_counter()
        try:
            yield event_id
        except Exception as exc:
            self.record_event(
                component=component,
                operation=operation,
                status=TraceEventStatus.ERROR,
                duration_ms=(time.perf_counter() - started) * 1000,
                attributes=attributes,
                error=exc,
                trace_id=trace_id,
                parent_event_id=parent_event_id,
                event_id=event_id,
            )
            raise
        else:
            self.record_event(
                component=component,
                operation=operation,
                status=TraceEventStatus.SUCCESS,
                duration_ms=(time.perf_counter() - started) * 1000,
                attributes=attributes,
                trace_id=trace_id,
                parent_event_id=parent_event_id,
                event_id=event_id,
            )
