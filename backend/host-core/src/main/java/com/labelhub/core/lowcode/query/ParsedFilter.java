package com.labelhub.core.lowcode.query;

public record ParsedFilter(String field, FilterOperator operator, Object value) {
}
