from app.llm_response_format import (
    build_json_object_response_format,
    build_json_schema_response_format,
    has_output_properties,
    response_format_attempts,
    should_retry_with_next_format,
)


def test_has_output_properties() -> None:
    assert has_output_properties({"type": "object", "properties": {"preferred": {"type": "string"}}})
    assert not has_output_properties({"type": "object", "properties": {}})
    assert not has_output_properties(None)


def test_response_format_attempts_prefers_json_schema() -> None:
    schema = {
        "type": "object",
        "properties": {"preferred": {"type": "string"}},
        "required": ["preferred"],
        "additionalProperties": False,
    }
    attempts = response_format_attempts(schema)
    assert attempts[0] == build_json_schema_response_format(schema)
    assert attempts[1] == build_json_object_response_format()
    assert attempts[2] is None


def test_should_retry_on_unsupported_response_format() -> None:
    assert should_retry_with_next_format(400, "response_format json_schema is not supported")
    assert not should_retry_with_next_format(401, "invalid api key")
