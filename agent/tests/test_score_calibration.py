"""分数锚点解析与校准测试。"""
from __future__ import annotations

from app.services.score_calibration import (
    calibrate_dimension_scores,
    calibrate_score,
    parse_score_anchor,
)


def test_parse_score_anchor_from_instruction() -> None:
    assert parse_score_anchor("理由充分；稳定评分锚点 88±5") == (88.0, 5.0)


def test_calibrate_score_clamps_outlier() -> None:
    assert calibrate_score(90, 88.0, 5.0) == (90, False)
    assert calibrate_score(96, 88.0, 5.0) == (93, True)


def test_calibrate_dimension_scores_uses_anchor_fields() -> None:
    scores = {"准确性": 90, "完整性": 96}
    specs = [
        {
            "dimensionKey": "ACCURACY",
            "dimensionName": "准确性",
            "anchorScore": 85,
            "anchorTolerance": 5,
        },
        {
            "dimensionKey": "COMPLETENESS",
            "dimensionName": "完整性",
            "anchorScore": 88,
            "anchorTolerance": 5,
        },
    ]

    calibrated, adjustments = calibrate_dimension_scores(
        scores,
        specs,
        llm_dimension_name=lambda spec: str(spec["dimensionName"]),
    )

    assert calibrated["准确性"] == 90
    assert calibrated["完整性"] == 93
    assert len(adjustments) == 1
    assert adjustments[0]["dimensionKey"] == "COMPLETENESS"
