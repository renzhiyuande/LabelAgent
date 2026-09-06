import pytest
from pydantic import ValidationError

from app.llm_chat import ChatCompletionRequest, ChatMessage
from app.llm_url import resolve_chat_url


def test_resolve_chat_url() -> None:
    assert resolve_chat_url("https://api.openai.com/v1") == "https://api.openai.com/v1/chat/completions"
    assert (
        resolve_chat_url("https://api.openai.com/v1/chat/completions")
        == "https://api.openai.com/v1/chat/completions"
    )


def test_chat_request_accepts_camel_case_alias() -> None:
    request = ChatCompletionRequest.model_validate(
        {
            "baseUrl": "https://api.openai.com/v1",
            "apiKey": "sk-test",
            "model": "gpt-4.1-mini",
            "messages": [{"role": "user", "content": "hello"}],
        }
    )
    assert request.base_url == "https://api.openai.com/v1"
    assert request.api_key == "sk-test"


def test_chat_request_accepts_snake_case() -> None:
    request = ChatCompletionRequest.model_validate(
        {
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-test",
            "model": "gpt-4.1-mini",
            "messages": [{"role": "user", "content": "hello"}],
        }
    )
    assert request.base_url.endswith("/v1")


def test_chat_request_requires_credentials() -> None:
    with pytest.raises(ValidationError):
        ChatCompletionRequest.model_validate(
            {
                "model": "gpt-4.1-mini",
                "messages": [ChatMessage(role="user", content="hi")],
            }
        )


def test_chat_request_accepts_output_json_schema_alias() -> None:
    request = ChatCompletionRequest.model_validate(
        {
            "baseUrl": "https://api.openai.com/v1",
            "apiKey": "sk-test",
            "model": "gpt-4.1-mini",
            "messages": [{"role": "user", "content": "hello"}],
            "outputJsonSchema": {
                "type": "object",
                "properties": {"preferred": {"type": "string"}},
                "required": ["preferred"],
                "additionalProperties": False,
            },
        }
    )
    assert request.output_json_schema is not None
    assert "preferred" in request.output_json_schema["properties"]
