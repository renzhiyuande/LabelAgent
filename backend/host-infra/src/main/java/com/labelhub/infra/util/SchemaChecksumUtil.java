package com.labelhub.infra.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.labelhub.core.util.DigestUtil;
import java.util.Map;

/**
 * Schema 校验和计算工具。
 * <p>
 * 使用 Jackson {@link ObjectMapper} + {@link SerializationFeature#ORDER_MAP_ENTRIES_BY_KEYS}
 * 生成规范化的排序 JSON，再计算 SHA-256 摘要。替代了此前手写的递归 JSON 序列化。
 * </p>
 */
public final class SchemaChecksumUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

    private SchemaChecksumUtil() {
    }

    /**
     * 计算 Schema Map 的 SHA-256 校验和。
     *
     * @param schemaMap 非空 schema 数据
     * @return 64 位十六进制校验和，或 {@code null}（入参为 null 时）
     */
    public static String computeChecksum(Map<String, Object> schemaMap) {
        if (schemaMap == null) {
            return null;
        }
        try {
            String canonicalJson = MAPPER.writeValueAsString(schemaMap);
            return DigestUtil.sha256Hex(canonicalJson);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize schema to canonical JSON", e);
        }
    }
}
