package com.labelhub.core.lowcode;

import java.util.Collections;
import java.util.Map;

public record OptionRequest(Map<String, String> params) {

    public OptionRequest {
        params = params == null ? Map.of() : Map.copyOf(params);
    }

    public static OptionRequest of(Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            return new OptionRequest(Collections.emptyMap());
        }
        return new OptionRequest(params);
    }

    public String get(String name) {
        return params.get(name);
    }

    public String keyword() {
        return get("keyword");
    }

    public String role() {
        return get("role");
    }
}
