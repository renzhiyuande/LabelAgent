import json

import pytest

from app.core.logging_config import set_trace_id
from app.observability.trace_recorder import (
    CompositeTraceSink,
    InMemoryTraceSink,
    JsonlTraceSink,
    TraceRecorder,
)
from app.schemas.trace import TraceEventStatus


def test_recorder_uses_current_trace_id():
    sink = InMemoryTraceSink(max_events=10)
    recorder = TraceRecorder(sink)
    set_trace_id("trace-123")

    event = recorder.record_event(
        component="evaluation",
        operation="compare",
        status=TraceEventStatus.SUCCESS,
        duration_ms=12.3456,
        attributes={"sampleCount": 300},
    )

    assert event.trace_id == "trace-123"
    assert event.duration_ms == 12.346
    assert sink.find_by_trace("trace-123")[0].attributes["sampleCount"] == 300


def test_span_records_success_and_failure():
    sink = InMemoryTraceSink(max_events=10)
    recorder = TraceRecorder(sink)
    set_trace_id("trace-span")

    with recorder.span(component="prompt", operation="gate"):
        pass

    with pytest.raises(RuntimeError):
        with recorder.span(component="prompt", operation="optimize"):
            raise RuntimeError("boom")

    events = sink.find_by_trace("trace-span")
    assert [event.status for event in events] == [
        TraceEventStatus.SUCCESS,
        TraceEventStatus.ERROR,
    ]
    assert events[1].error_type == "RuntimeError"
    assert events[1].error_message == "boom"


def test_memory_sink_is_bounded():
    sink = InMemoryTraceSink(max_events=2)
    recorder = TraceRecorder(sink)

    for idx in range(3):
        recorder.record_event(
            component="test",
            operation=str(idx),
            status=TraceEventStatus.SUCCESS,
            trace_id="bounded",
        )

    assert [event.operation for event in sink.snapshot()] == ["1", "2"]


def test_jsonl_sink_persists_alias_serialized_event(tmp_path):
    jsonl = tmp_path / "trace" / "events.jsonl"
    memory = InMemoryTraceSink(max_events=10)
    recorder = TraceRecorder(CompositeTraceSink([memory, JsonlTraceSink(jsonl)]))

    recorder.record_event(
        component="http",
        operation="POST /v1/ai-review",
        status=TraceEventStatus.SUCCESS,
        trace_id="trace-jsonl",
        attributes={"statusCode": 200},
    )

    lines = jsonl.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1
    payload = json.loads(lines[0])
    assert payload["traceId"] == "trace-jsonl"
    assert payload["attributes"]["statusCode"] == 200
    assert "occurredAt" in payload
