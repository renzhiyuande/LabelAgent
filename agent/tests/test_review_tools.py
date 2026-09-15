from app.tools.review_tools import ReviewToolContext, ReviewToolRegistry, ToolExecutionError


def make_context() -> ReviewToolContext:
    return ReviewToolContext(
        source_data={
            "reference": {"answer": "Beijing", "score": 10},
        },
        label_data={
            "answer": "  beijing  ",
            "comment": "",
        },
        memory_context=[
            {"caseId": "a", "summary": "address normalization mismatch"},
            {"caseId": "b", "summary": "numeric score review"},
        ],
    )


def test_check_required_fields_reports_missing_and_empty() -> None:
    registry = ReviewToolRegistry()
    result = registry.execute(
        name="check_required_fields",
        arguments={"fields": ["answer", "comment", "missing"]},
        context=make_context(),
    )

    assert result["complete"] is False
    assert result["missingFields"] == ["missing"]
    assert result["emptyFields"] == ["comment"]


def test_compare_fields_supports_dotted_paths_and_text_normalization() -> None:
    registry = ReviewToolRegistry()
    result = registry.execute(
        name="compare_fields",
        arguments={
            "pairs": [
                {
                    "sourcePath": "reference.answer",
                    "labelPath": "answer",
                    "normalizeText": True,
                }
            ]
        },
        context=make_context(),
    )

    assert result["allEqual"] is True
    assert result["mismatchCount"] == 0


def test_search_review_memory_returns_matching_authorized_cases() -> None:
    registry = ReviewToolRegistry()
    result = registry.execute(
        name="search_review_memory",
        arguments={"query": "numeric score", "limit": 2},
        context=make_context(),
    )

    assert result["matchCount"] == 1
    assert result["matches"][0]["caseId"] == "b"


def test_unknown_tool_is_rejected() -> None:
    registry = ReviewToolRegistry()
    try:
        registry.execute(name="delete_submission", arguments={}, context=make_context())
    except ToolExecutionError as exc:
        assert "unknown tool" in str(exc)
    else:
        raise AssertionError("unknown tool must be rejected")
