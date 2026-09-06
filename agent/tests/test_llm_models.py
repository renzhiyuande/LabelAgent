from app.llm_models import infer_model_type
from app.llm_url import resolve_chat_url, resolve_models_url, resolve_openai_compatible_path


def test_resolve_models_url_appends_v1_models() -> None:
    assert resolve_models_url("https://api.openai.com/v1") == "https://api.openai.com/v1/models"


def test_resolve_models_url_keeps_existing_models_suffix() -> None:
    assert resolve_models_url("https://api.openai.com/v1/models") == "https://api.openai.com/v1/models"


def test_resolve_models_url_volcengine_v3_base() -> None:
    assert (
        resolve_models_url("https://ark.cn-beijing.volces.com/api/v3")
        == "https://ark.cn-beijing.volces.com/api/v3/models"
    )


def test_resolve_chat_url_volcengine_v3_base() -> None:
    assert (
        resolve_chat_url("https://ark.cn-beijing.volces.com/api/v3")
        == "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    )


def test_resolve_openai_compatible_path_plain_host() -> None:
    assert (
        resolve_openai_compatible_path("https://api.openai.com", "models")
        == "https://api.openai.com/v1/models"
    )


def test_infer_model_type_embedding() -> None:
    assert infer_model_type("text-embedding-3-small") == "EMBEDDING"


def test_infer_model_type_chat() -> None:
    assert infer_model_type("gpt-4o") == "CHAT"
