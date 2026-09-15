"""Process-level trace recorder configuration.

The in-memory sink is always enabled for recent-event inspection.  JSONL
persistence is opt-in via LABELHUB_TRACE_JSONL_PATH.
"""
from __future__ import annotations

import os

from app.observability.trace_recorder import (
    CompositeTraceSink,
    InMemoryTraceSink,
    JsonlTraceSink,
    TraceRecorder,
)


def _positive_int(value: str | None, default: int) -> int:
    if not value:
        return default
    try:
        parsed = int(value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


runtime_trace_store = InMemoryTraceSink(
    max_events=_positive_int(os.getenv("LABELHUB_TRACE_MEMORY_EVENTS"), 2000)
)

_trace_sinks = [runtime_trace_store]
_trace_jsonl_path = (os.getenv("LABELHUB_TRACE_JSONL_PATH") or "").strip()
if _trace_jsonl_path:
    _trace_sinks.append(JsonlTraceSink(_trace_jsonl_path))

runtime_trace_recorder = TraceRecorder(CompositeTraceSink(_trace_sinks))
