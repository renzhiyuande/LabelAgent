package com.labelhub.core.lowcode.query;

public enum FilterOperator {
    EQ("eq"),
    LIKE("like"),
    IN("in"),
    BETWEEN("between"),
    GTE("gte"),
    LTE("lte");

    private final String wireValue;

    FilterOperator(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static FilterOperator fromWire(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("filter op is required");
        }
        for (FilterOperator operator : values()) {
            if (operator.wireValue.equalsIgnoreCase(value.trim())) {
                return operator;
            }
        }
        throw new IllegalArgumentException("unsupported filter op: " + value);
    }
}
