import json

from app.schemas.context_management import ContextSelectionPolicy
from app.services.context_manager import ContextManager


def test_context_priority_orders_rules_before_history():
    result = ContextManager().select(
        [
            {"contextType": "review_history", "id": "h1", "content": "old"},
            {"contextType": "project_rule", "id": "r1", "content": "must follow"},
            {"contextType": "bad_case", "id": "b1", "content": "example"},
        ]
    )

    assert [item["id"] for item in result.items] == ["r1", "b1", "h1"]


def test_explicit_priority_overrides_type_priority():
    result = ContextManager().select(
        [
            {"contextType": "project_rule", "id": "r1", "content": "rule"},
            {"contextType": "generic", "id": "g1", "priority": 999, "content": "urgent"},
        ]
    )

    assert [item["id"] for item in result.items] == ["g1", "r1"]


def test_duplicate_id_keeps_highest_priority_candidate():
    result = ContextManager().select(
        [
            {"contextType": "bad_case", "caseId": "case-1", "priority": 10, "content": "old"},
            {"contextType": "bad_case", "caseId": "case-1", "priority": 90, "content": "preferred"},
        ]
    )

    assert len(result.items) == 1
    assert result.items[0]["content"] == "preferred"
    assert result.stats.deduplicated_count == 1


def test_item_type_and_character_budgets_are_enforced_without_truncating_items():
    policy = ContextSelectionPolicy(
        maxItems=3,
        maxChars=230,
        perTypeLimits={"review_history": 1},
    )
    result = ContextManager().select(
        [
            {"contextType": "project_rule", "id": "r1", "content": "x" * 30},
            {"contextType": "review_history", "id": "h1", "content": "y" * 20},
            {"contextType": "review_history", "id": "h2", "content": "z" * 20},
            {"contextType": "generic", "id": "g1", "content": "w" * 200},
        ],
        policy=policy,
    )

    ids = [item["id"] for item in result.items]
    assert "r1" in ids
    assert "h1" in ids
    assert "h2" not in ids
    assert "g1" not in ids
    assert result.stats.type_limit_rejected_count == 1
    assert result.stats.char_budget_rejected_count >= 1
    assert all(len(item.get("content", "")) in {20, 30} for item in result.items)
    assert result.stats.selected_chars == len(
        json.dumps(result.items, ensure_ascii=False, indent=2, default=str)
    )
    assert result.stats.selected_chars <= policy.max_chars


def test_canonical_content_is_deduplicated_without_explicit_id():
    item = {"contextType": "generic", "content": "same", "meta": {"a": 1}}
    result = ContextManager().select([item, dict(item)])

    assert result.stats.selected_count == 1
    assert result.stats.deduplicated_count == 1
