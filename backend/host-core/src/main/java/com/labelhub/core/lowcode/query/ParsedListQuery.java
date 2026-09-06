package com.labelhub.core.lowcode.query;

import com.labelhub.core.lowcode.LowCodeDtos.SortRule;
import java.util.List;

public record ParsedListQuery(
        int page,
        int pageSize,
        String keyword,
        List<ParsedFilter> filters,
        List<SortRule> sort) {

    public static final int MAX_PAGE_SIZE = 100;
    public static final int DEFAULT_PAGE_SIZE = 10;

    public ParsedListQuery {
        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? DEFAULT_PAGE_SIZE : Math.min(pageSize, MAX_PAGE_SIZE);
        filters = filters == null ? List.of() : List.copyOf(filters);
        sort = sort == null ? List.of() : List.copyOf(sort);
    }
}
