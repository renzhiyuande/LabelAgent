"""Run LabelAgent offline evaluation from a JSON dataset.

Examples:
  python scripts/run_offline_evaluation.py evaluate dataset.json
  python scripts/run_offline_evaluation.py compare comparison.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

AGENT_ROOT = Path(__file__).resolve().parents[1]
if str(AGENT_ROOT) not in sys.path:
    sys.path.insert(0, str(AGENT_ROOT))

from app.schemas.evaluation import EvaluationDataset, ReplayComparisonRequest
from app.services.evaluation_service import OfflineEvaluationService


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="LabelAgent offline evaluation runner")
    parser.add_argument("mode", choices=("evaluate", "compare"))
    parser.add_argument("input", type=Path, help="Path to evaluation JSON file")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    payload = load_json(args.input)
    service = OfflineEvaluationService()

    if args.mode == "evaluate":
        result = service.evaluate(EvaluationDataset.model_validate(payload))
    else:
        result = service.compare(ReplayComparisonRequest.model_validate(payload))

    print(json.dumps(result.model_dump(by_alias=True), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
