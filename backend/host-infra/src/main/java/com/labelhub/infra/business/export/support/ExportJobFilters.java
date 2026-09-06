package com.labelhub.infra.business.export.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public record ExportJobFilters(String exportScope, List<String> statuses, Long labelerId) {

    public static final String SCOPE_APPROVED_ONLY = "APPROVED_ONLY";
    public static final String SCOPE_ALL = "ALL";

    public static ExportJobFilters approvedOnly() {
        return new ExportJobFilters(SCOPE_APPROVED_ONLY, List.of(), null);
    }

    public static ExportJobFilters fromJson(String json, ObjectMapper objectMapper) {
        if (json == null || json.isBlank()) {
            return approvedOnly();
        }
        try {
            Map<String, Object> raw = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
            return fromMap(raw);
        } catch (Exception ex) {
            return approvedOnly();
        }
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> coerceRawFilter(Object raw, ObjectMapper objectMapper) {
        if (raw == null) {
            return Map.of();
        }
        if (raw instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        if (raw instanceof String text) {
            if (text.isBlank()) {
                return Map.of();
            }
            try {
                Map<String, Object> parsed = objectMapper.readValue(text, new TypeReference<Map<String, Object>>() {
                });
                return parsed == null ? Map.of() : parsed;
            } catch (Exception ex) {
                return Map.of();
            }
        }
        return Map.of();
    }

    public static ExportJobFilters fromMap(Map<String, Object> raw) {
        if (raw == null || raw.isEmpty()) {
            return approvedOnly();
        }
        String exportScope = SCOPE_APPROVED_ONLY;
        Object scopeValue = raw.get("exportScope");
        if (scopeValue != null && SCOPE_ALL.equalsIgnoreCase(String.valueOf(scopeValue))) {
            exportScope = SCOPE_ALL;
        }
        List<String> statuses = new ArrayList<>();
        Object statusesValue = raw.get("statuses");
        if (statusesValue instanceof List<?> list) {
            for (Object item : list) {
                if (item != null && !String.valueOf(item).isBlank()) {
                    statuses.add(String.valueOf(item).trim());
                }
            }
        }
        Long labelerId = null;
        Object labelerValue = raw.get("labelerId");
        if (labelerValue instanceof Number number) {
            labelerId = number.longValue();
        } else if (labelerValue != null && !String.valueOf(labelerValue).isBlank()) {
            try {
                labelerId = Long.parseLong(String.valueOf(labelerValue).trim());
            } catch (NumberFormatException ignored) {
                labelerId = null;
            }
        }
        return new ExportJobFilters(exportScope, List.copyOf(statuses), labelerId);
    }
}
