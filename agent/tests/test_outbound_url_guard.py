import socket

import pytest

from app.outbound_url_guard import OutboundUrlError, require_safe_base_url


def test_allows_public_https(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LABELHUB_LLM_OUTBOUND_ALLOW_LOCALHOST", raising=False)

    def fake_getaddrinfo(host: str, port, *args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    assert require_safe_base_url("https://api.openai.com/v1") == "https://api.openai.com/v1"


def test_blocks_private_ip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LABELHUB_LLM_OUTBOUND_ALLOW_LOCALHOST", raising=False)
    with pytest.raises(OutboundUrlError):
        require_safe_base_url("https://10.0.0.5/v1")


def test_allows_localhost_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LABELHUB_LLM_OUTBOUND_ALLOW_LOCALHOST", "true")
    assert require_safe_base_url("http://127.0.0.1:11434/v1") == "http://127.0.0.1:11434/v1"


def test_allows_proxy_fake_ip_from_hostname_resolution(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LABELHUB_LLM_OUTBOUND_ALLOW_LOCALHOST", raising=False)

    def fake_getaddrinfo(host: str, port, *args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("198.18.0.118", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    assert require_safe_base_url("https://api.deepseek.com") == "https://api.deepseek.com"


def test_blocks_literal_proxy_fake_ip(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LABELHUB_LLM_OUTBOUND_ALLOW_LOCALHOST", raising=False)
    with pytest.raises(OutboundUrlError):
        require_safe_base_url("https://198.18.0.118/v1")
