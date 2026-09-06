package com.labelhub.core.lowcode.query;

import com.labelhub.core.lowcode.LowCodeDtos.FilterRule;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.LowCodeDtos.SortRule;
import java.util.ArrayList;
import java.util.List;

public class ListQueryParser {
    public ParsedListQuery parse(ListQuery query) {
        List<FilterRule> sourceFilters = query.filters() == null ? List.of() : query.filters();
        List<ParsedFilter> parsedFilters = new ArrayList<>();
        String keyword = null;
        for (FilterRule filter : sourceFilters) {
            if ("keyword".equals(filter.field())) {
                keyword = normalizeString(filter.value());
                continue;
            }
            FilterOperator operator = FilterOperator.fromWire(filter.op());
            parsedFilters.add(new ParsedFilter(filter.field(), operator, normalizeValue(operator, filter.value())));
        }
        List<SortRule> sort = query.sort() == null ? List.of() : query.sort();
        return new ParsedListQuery(
                query.normalizedPage(),
                query.normalizedPageSize(),
                keyword,
                List.copyOf(parsedFilters),
                List.copyOf(sort));
    }

    private Object normalizeValue(FilterOperator operator, Object rawValue) {
        if (operator == FilterOperator.BETWEEN) {
            if (!(rawValue instanceof List<?> values) || values.size() != 2) {
                throw new IllegalArgumentException("between filter value must be [start, end]");
            }
            return List.of(values.get(0), values.get(1));
        }
        if (operator == FilterOperator.IN) {
            if (!(rawValue instanceof List<?> values)) {
                throw new IllegalArgumentException("in filter value must be an array");
            }
            return List.copyOf(values);
        }
        return rawValue;
    }

    private String normalizeString(Object value) {
        if (value instanceof String text) {
            String trimmed = text.trim();
            return trimmed.isEmpty() ? null : trimmed;
        }
        return null;
    }
}
