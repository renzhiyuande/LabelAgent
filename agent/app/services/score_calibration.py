"""维度分数锚点解析与校准（抑制 LLM 同题漂移）。"""
from __future__ import annotations

import re
from typing import Any

_ANCHOR_PATTERN = re.compile(r"(?P<anchor>\d{1,3})\s*[±\+\-]\s*(?P<tolerance>\d{1,3})")


def parse_score_anchor(prompt_instruction: str | None) -> tuple[float | None, float | None]:
    if not prompt_instruction:
        return None, None
    match = _ANCHOR_PATTERN.search(prompt_instruction)
    if not match:
        return None, None
    return float(match.group("anchor")), float(match.group("tolerance"))


def resolve_dimension_anchor(spec: dict[str, Any]) -> tuple[float | None, float | None]:
    anchor = spec.get("anchorScore", spec.get("anchor_score"))
    tolerance = spec.get("anchorTolerance", spec.get("anchor_tolerance"))
    if anchor is not None and tolerance is not None:
        return float(anchor), float(tolerance)
    instruction = spec.get("promptInstruction") or spec.get("prompt_instruction")
    return parse_score_anchor(instruction if isinstance(instruction, str) else None)


def calibrate_score(raw_score: int, anchor: float | None, tolerance: float | None) -> tuple[int, bool]:
    if anchor is None or tolerance is None:
        return raw_score, False
    low = anchor - tolerance
    high = anchor + tolerance
    clamped = int(round(max(low, min(high, float(raw_score)))))
    return clamped, clamped != raw_score


def calibrate_dimension_scores(
    scores: dict[str, int],
    dimension_specs: list[dict[str, Any]],
    *,
    llm_dimension_name,
) -> tuple[dict[str, int], list[dict[str, Any]]]:
    calibrated = dict(scores)
    adjustments: list[dict[str, Any]] = []

    for spec in dimension_specs:
        llm_name = llm_dimension_name(spec)
        dimension_key = str(spec.get("dimensionKey") or spec.get("dimension_key") or llm_name)
        raw = scores.get(llm_name)
        if raw is None:
            raw = scores.get(dimension_key)
        if raw is None:
            continue

        anchor, tolerance = resolve_dimension_anchor(spec)
        next_score, adjusted = calibrate_score(int(raw), anchor, tolerance)
        calibrated[llm_name] = next_score
        if dimension_key != llm_name:
            calibrated[dimension_key] = next_score
        if adjusted:
            adjustments.append(
                {
                    "dimensionKey": dimension_key,
                    "dimensionName": llm_name,
                    "rawScore": int(raw),
                    "calibratedScore": next_score,
                    "anchor": anchor,
                    "tolerance": tolerance,
                }
            )

    return calibrated, adjustments
