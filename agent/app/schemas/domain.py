"""预审核心领域枚举（无 DB 依赖）。"""
from __future__ import annotations

from enum import Enum


class ReviewDecision(str, Enum):
    pass_ = "pass"
    reject = "reject"
    manual = "manual"
