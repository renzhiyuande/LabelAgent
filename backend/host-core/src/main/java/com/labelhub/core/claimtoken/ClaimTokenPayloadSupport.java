package com.labelhub.core.claimtoken;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class ClaimTokenPayloadSupport {
    private ClaimTokenPayloadSupport() {
    }

    public static Long readLong(Map<String, Object> payload, String key) {
        if (payload == null) {
            return null;
        }
        return readLongValue(payload.get(key));
    }

    /** Parses a long written either as JSON number or string (snowflake-safe serialization). */
    public static Long readLongValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public static List<Long> readLongList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Long> ids = new ArrayList<>(list.size());
        for (Object item : list) {
            Long id = readLongValue(item);
            if (id != null) {
                ids.add(id);
            }
        }
        return ids;
    }

    public static Integer readInt(Map<String, Object> payload, String key) {
        if (payload == null) {
            return null;
        }
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public static int resolveLabelerClaimCount(Map<String, Object> payload, int defaultCount) {
        Integer count = readInt(payload, "count");
        if (count == null || count <= 0) {
            return defaultCount;
        }
        return count;
    }
}
