package com.labelhub.core.api;

import java.util.List;

public record PageResponse<T>(long total, int page, int pageSize, List<T> list) {
    public static <T> PageResponse<T> of(long total, int page, int pageSize, List<T> list) {
        return new PageResponse<>(total, page, pageSize, List.copyOf(list));
    }

    public static <T> PageResponse<T> empty() {
        return new PageResponse<>(0, 1, 20, List.of());
    }
}
