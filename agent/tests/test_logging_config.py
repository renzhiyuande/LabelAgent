from app.core.logging_config import mask_secret, safe_json, summarize_chat_messages, truncate_text


def test_mask_secret_masks_middle() -> None:
    assert mask_secret("sk-abcdefghijklmnop") == "***************mnop"


def test_truncate_text_appends_suffix() -> None:
    assert truncate_text("abcdef", max_len=3) == "abc…(+3 chars)"


def test_safe_json_serializes_dict() -> None:
    assert '"a": 1' in safe_json({"a": 1})


def test_summarize_chat_messages() -> None:
    summary = summarize_chat_messages(
        [{"role": "user", "content": "hello world"}],
        preview_chars=5,
    )
    assert summary[0]["role"] == "user"
    assert summary[0]["contentLen"] == 11
    assert summary[0]["preview"] == "hello…(+6 chars)"
