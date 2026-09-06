package com.labelhub.infra.security;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 校验 LLM 提供商出站 baseUrl，降低 SSRF 风险（内网/metadata 探测）。
 */
@Component
public class LlmOutboundUrlValidator {
    private final boolean allowLocalhost;

    public LlmOutboundUrlValidator(
            @Value("${labelhub.security.llm-outbound-allow-localhost:false}") boolean allowLocalhost) {
        this.allowLocalhost = allowLocalhost;
    }

    public String requireSafeBaseUrl(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl is required");
        }
        String trimmed = baseUrl.trim();
        URI uri;
        try {
            uri = new URI(trimmed);
        } catch (URISyntaxException ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl is invalid");
        }
        String scheme = uri.getScheme();
        if (scheme == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl must include http or https scheme");
        }
        String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
        if (!"https".equals(normalizedScheme) && !"http".equals(normalizedScheme)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl scheme must be http or https");
        }
        if (uri.getUserInfo() != null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl must not contain credentials");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl host is required");
        }
        String normalizedHost = host.toLowerCase(Locale.ROOT);
        if (isBlockedMetadataHost(normalizedHost)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl host is not allowed");
        }
        if (!allowLocalhost && isLocalhostHostname(normalizedHost)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl host is not allowed");
        }
        if (isLiteralBlockedIp(normalizedHost)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl must not target private or link-local addresses");
        }
        resolveAndValidateHost(normalizedHost);
        return trimmed;
    }

    private void resolveAndValidateHost(String host) {
        try {
            for (InetAddress address : InetAddress.getAllByName(host)) {
                validateResolvedAddress(address);
            }
        } catch (UnknownHostException ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "baseUrl host cannot be resolved");
        }
    }

    private void validateResolvedAddress(InetAddress address) {
        if (address.isAnyLocalAddress()) {
            throw blocked();
        }
        if (address.isLoopbackAddress()) {
            if (!allowLocalhost) {
                throw blocked();
            }
            return;
        }
        if (address.isLinkLocalAddress() || address.isSiteLocalAddress()) {
            throw blocked();
        }
        byte[] bytes = address.getAddress();
        if (bytes.length == 4 && isCarrierGradeNat(bytes)) {
            throw blocked();
        }
    }

    private static boolean isLocalhostHostname(String host) {
        return "localhost".equals(host) || host.endsWith(".localhost");
    }

    private static boolean isBlockedMetadataHost(String host) {
        return "metadata.google.internal".equals(host) || "metadata".equals(host);
    }

    private static boolean isLiteralBlockedIp(String host) {
        if ("127.0.0.1".equals(host) || "::1".equals(host)) {
            return false;
        }
        if ("0.0.0.0".equals(host)) {
            return true;
        }
        if (host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.")) {
            return true;
        }
        if (host.startsWith("169.254.") || "169.254.169.254".equals(host)) {
            return true;
        }
        if (host.startsWith("172.")) {
            String[] parts = host.split("\\.");
            if (parts.length >= 2) {
                try {
                    int second = Integer.parseInt(parts[1]);
                    if (second >= 16 && second <= 31) {
                        return true;
                    }
                } catch (NumberFormatException ignored) {
                    return true;
                }
            }
        }
        return host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
    }

    private static boolean isCarrierGradeNat(byte[] bytes) {
        int first = Byte.toUnsignedInt(bytes[0]);
        int second = Byte.toUnsignedInt(bytes[1]);
        return first == 100 && second >= 64 && second <= 127;
    }

    private static BusinessException blocked() {
        return new BusinessException(
                ErrorCode.VALIDATION_ERROR,
                "baseUrl must not target private, link-local or metadata addresses");
    }
}
