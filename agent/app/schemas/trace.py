"""Structured observability events for Agent runtime operations."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TraceEventStatus(str, Enum):
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"


class TraceEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    trace_id: str = Field(alias="traceId")
    event_id: str = Field(alias="eventId")
    parent_event_id: str | None = Field(default=None, alias="parentEventId")
    component: str
    operation: str
    status: TraceEventStatus
    occurred_at: datetime = Field(alias="occurredAt")
    duration_ms: float | None = Field(default=None, ge=0, alias="durationMs")
    attributes: dict[str, Any] = Field(default_factory=dict)
    error_type: str | None = Field(default=None, alias="errorType")
    error_message: str | None = Field(default=None, alias="errorMessage")
