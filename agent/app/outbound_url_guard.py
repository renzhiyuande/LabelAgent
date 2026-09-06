"""出站 URL 安全校验，降低 SSRF 风险。"""
from __future__ import annotations

import ipaddress
import os
import socket
from urllib.parse import urlparse


class OutboundUrlError(ValueError):
    pass


_PROXY_FAKE_IPV4 = ipaddress.ip_network("198.18.0.0/15")


def _is_proxy_fake_ip(address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Surge/Clash 等 TUN 模式会把公网域名解析到 198.18.0.0/15 假 IP。"""
    return isinstance(address, ipaddress.IPv4Address) and address in _PROXY_FAKE_IPV4


def _allow_localhost() -> bool:
    return os.getenv("LABELHUB_LLM_OUTBOUND_ALLOW_LOCALHOST", "false").lower() in {
        "1",
        "true",
        "yes",
    }


def require_safe_base_url(base_url: str) -> str:
    trimmed = (base_url or "").strip()
    if not trimmed:
        raise OutboundUrlError("baseUrl is required")

    parsed = urlparse(trimmed)
    scheme = (parsed.scheme or "").lower()
    if scheme not in {"http", "https"}:
        raise OutboundUrlError("baseUrl scheme must be http or https")
    if parsed.username or parsed.password:
        raise OutboundUrlError("baseUrl must not contain credentials")

    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise OutboundUrlError("baseUrl host is required")
    if host in {"metadata", "metadata.google.internal"}:
        raise OutboundUrlError("baseUrl host is not allowed")

    allow_localhost = _allow_localhost()
    if host in {"localhost"} or host.endswith(".localhost"):
        if not allow_localhost:
            raise OutboundUrlError("baseUrl host is not allowed")
        return trimmed

    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None

    if literal is not None:
        _validate_ip(literal, allow_localhost, allow_proxy_fake=False)
        return trimmed

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise OutboundUrlError("baseUrl host cannot be resolved") from exc

    seen: set[str] = set()
    for info in infos:
        sockaddr = info[4]
        if not sockaddr:
            continue
        ip_text = sockaddr[0]
        if ip_text in seen:
            continue
        seen.add(ip_text)
        _validate_ip(ipaddress.ip_address(ip_text), allow_localhost, allow_proxy_fake=True)

    return trimmed


def _validate_ip(
    address: ipaddress.IPv4Address | ipaddress.IPv6Address,
    allow_localhost: bool,
    *,
    allow_proxy_fake: bool,
) -> None:
    if allow_proxy_fake and _is_proxy_fake_ip(address):
        return
    if address.is_loopback:
        if not allow_localhost:
            raise OutboundUrlError("baseUrl must not target private or metadata addresses")
        return
    if (
        address.is_private
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
        or address.is_unspecified
    ):
        raise OutboundUrlError("baseUrl must not target private or metadata addresses")
