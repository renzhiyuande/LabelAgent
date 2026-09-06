package com.labelhub.core.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.apache.commons.codec.binary.Hex;
import org.apache.commons.codec.digest.DigestUtils;

/**
 * 摘要计算工具类（SHA-256）。
 * <p>
 * 统一管理项目中 5+ 处散落的 SHA-256 + Hex/Base64 实现。
 * 内部分发到 commons-codec 的 {@link DigestUtils}、{@link Hex}。</p>
 */
public final class DigestUtil {

    private static final String SHA_256 = "SHA-256";

    private DigestUtil() {
    }

    /**
     * 计算字符串的 SHA-256 十六进制摘要。
     */
    public static String sha256Hex(String input) {
        if (input == null) {
            return null;
        }
        return DigestUtils.sha256Hex(input.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 计算字节数组的 SHA-256 十六进制摘要。
     */
    public static String sha256Hex(byte[] input) {
        if (input == null) {
            return null;
        }
        return DigestUtils.sha256Hex(input);
    }

    /**
     * 计算字符串的 SHA-256 原始字节。
     */
    public static byte[] sha256(String input) {
        if (input == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance(SHA_256);
            return digest.digest(input.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    /**
     * 计算字符串的 SHA-256 Base64 URL 安全编码摘要（无填充）。
     * 用于 {@code InMemoryAuthService} 的 token 哈希索引。
     */
    public static String sha256Base64Url(String input) {
        if (input == null || input.isBlank()) {
            return input;
        }
        byte[] digest = sha256(input);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
    }
}
