package com.labelhub.infra.lowcode;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.LowCodeDtos.FilterRule;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.query.ListQueryParser;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class LowCodeQuerySupport {
    private final ListQueryParser queryParser = new ListQueryParser();

    public PageQuery toPageQuery(ListQuery query) {
        ParsedListQuery parsed = parse(query);
        return new PageQuery(parsed.page(), parsed.pageSize(), parsed.keyword());
    }

    public ParsedListQuery parse(ListQuery query) {
        try {
            return queryParser.parse(query);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, ex.getMessage());
        }
    }

    public <T> ParsedListQuery parse(ListQuery query, ResourceQuerySpec<T> spec) {
        ParsedListQuery parsed = parse(query);
        for (ParsedFilter filter : parsed.filters()) {
            if (spec.filter(filter.field()) == null) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "unsupported filter field: " + filter.field());
            }
        }
        return parsed;
    }

    public String extractKeyword(List<FilterRule> filters) {
        if (filters == null || filters.isEmpty()) {
            return null;
        }
        return filters.stream()
                .filter(filter -> "keyword".equals(filter.field()) || "like".equals(filter.op()))
                .map(FilterRule::value)
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .findFirst()
                .orElse(null);
    }

    public String extractStringFilter(List<FilterRule> filters, String fieldName) {
        if (filters == null || filters.isEmpty()) {
            return null;
        }
        return filters.stream()
                .filter(filter -> fieldName.equals(filter.field()))
                .map(FilterRule::value)
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .filter(text -> !text.isBlank())
                .findFirst()
                .orElse(null);
    }

    public Long extractLongFilter(List<FilterRule> filters, String fieldName) {
        if (filters == null || filters.isEmpty()) {
            return null;
        }
        return filters.stream()
                .filter(filter -> fieldName.equals(filter.field()))
                .map(FilterRule::value)
                .map(value -> {
                    if (value instanceof Number number) {
                        return number.longValue();
                    }
                    if (value instanceof String text && !text.isBlank()) {
                        return Long.parseLong(text);
                    }
                    return null;
                })
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }

    public Long requireLongFilter(List<FilterRule> filters, String fieldName) {
        Long value = extractLongFilter(filters, fieldName);
        if (value == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, fieldName + " filter is required");
        }
        return value;
    }
}
