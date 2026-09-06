package com.labelhub.infra.lowcode.query;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.labelhub.core.lowcode.query.FilterOperator;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ResourceQuerySpec<T> {
    @FunctionalInterface
    public interface FilterApplier<T> {
        void apply(LambdaQueryWrapper<T> wrapper, FilterOperator operator, Object value);
    }

    private final Map<String, FilterApplier<T>> filters;
    private final Map<String, SFunction<T, ?>> sorts;

    private ResourceQuerySpec(Map<String, FilterApplier<T>> filters, Map<String, SFunction<T, ?>> sorts) {
        this.filters = Map.copyOf(filters);
        this.sorts = Map.copyOf(sorts);
    }

    public FilterApplier<T> filter(String field) {
        return filters.get(field);
    }

    public SFunction<T, ?> sort(String field) {
        return sorts.get(field);
    }

    public static <T> Builder<T> builder() {
        return new Builder<>();
    }

    public static final class Builder<T> {
        private final Map<String, FilterApplier<T>> filters = new LinkedHashMap<>();
        private final Map<String, SFunction<T, ?>> sorts = new LinkedHashMap<>();

        public Builder<T> stringFilter(String field, SFunction<T, String> getter) {
            filters.put(field, (wrapper, operator, value) -> applyStringFilter(wrapper, getter, operator, value));
            return this;
        }

        public Builder<T> prefixFilter(String field, SFunction<T, String> getter) {
            filters.put(field, (wrapper, operator, value) -> {
                String text = asString(value);
                if (text != null) {
                    wrapper.likeRight(getter, text);
                }
            });
            return this;
        }

        public Builder<T> longFilter(String field, SFunction<T, Long> getter) {
            filters.put(field, (wrapper, operator, value) -> applyLongFilter(wrapper, getter, operator, value));
            return this;
        }

        public Builder<T> integerFilter(String field, SFunction<T, Integer> getter) {
            filters.put(field, (wrapper, operator, value) -> applyIntegerFilter(wrapper, getter, operator, value));
            return this;
        }

        public Builder<T> instantFilter(String field, SFunction<T, Instant> getter) {
            filters.put(field, (wrapper, operator, value) -> applyInstantFilter(wrapper, getter, operator, value));
            return this;
        }

        public Builder<T> sortField(String field, SFunction<T, ?> getter) {
            sorts.put(field, getter);
            return this;
        }

        public ResourceQuerySpec<T> build() {
            return new ResourceQuerySpec<>(filters, sorts);
        }
    }

    private static <T> void applyStringFilter(
            LambdaQueryWrapper<T> wrapper,
            SFunction<T, String> getter,
            FilterOperator operator,
            Object value) {
        String text = asString(value);
        if (text == null) {
            return;
        }
        switch (operator) {
            case EQ -> wrapper.eq(getter, text);
            case LIKE -> wrapper.like(getter, text);
            case IN -> {
                if (value instanceof List<?> values && !values.isEmpty()) {
                    wrapper.in(getter,
                            values.stream().map(ResourceQuerySpec::asString).filter(item -> item != null).toList());
                }
            }
            default -> {
            }
        }
    }

    private static <T> void applyLongFilter(
            LambdaQueryWrapper<T> wrapper,
            SFunction<T, Long> getter,
            FilterOperator operator,
            Object value) {
        Long longValue = asLong(value);
        switch (operator) {
            case EQ -> {
                if (longValue != null) {
                    wrapper.eq(getter, longValue);
                }
            }
            case GTE -> {
                if (longValue != null) {
                    wrapper.ge(getter, longValue);
                }
            }
            case LTE -> {
                if (longValue != null) {
                    wrapper.le(getter, longValue);
                }
            }
            case IN -> {
                if (value instanceof List<?> values && !values.isEmpty()) {
                    wrapper.in(getter,
                            values.stream().map(ResourceQuerySpec::asLong).filter(item -> item != null).toList());
                }
            }
            case BETWEEN -> {
                if (value instanceof List<?> values && values.size() == 2) {
                    Long start = asLong(values.get(0));
                    Long end = asLong(values.get(1));
                    if (start != null && end != null) {
                        wrapper.between(getter, start, end);
                    }
                }
            }
            default -> {
            }
        }
    }

    private static <T> void applyIntegerFilter(
            LambdaQueryWrapper<T> wrapper,
            SFunction<T, Integer> getter,
            FilterOperator operator,
            Object value) {
        Integer intValue = asInteger(value);
        switch (operator) {
            case EQ -> {
                if (intValue != null) {
                    wrapper.eq(getter, intValue);
                }
            }
            case GTE -> {
                if (intValue != null) {
                    wrapper.ge(getter, intValue);
                }
            }
            case LTE -> {
                if (intValue != null) {
                    wrapper.le(getter, intValue);
                }
            }
            case IN -> {
                if (value instanceof List<?> values && !values.isEmpty()) {
                    wrapper.in(getter,
                            values.stream().map(ResourceQuerySpec::asInteger).filter(item -> item != null).toList());
                }
            }
            case BETWEEN -> {
                if (value instanceof List<?> values && values.size() == 2) {
                    Integer start = asInteger(values.get(0));
                    Integer end = asInteger(values.get(1));
                    if (start != null && end != null) {
                        wrapper.between(getter, start, end);
                    }
                }
            }
            default -> {
            }
        }
    }

    private static <T> void applyInstantFilter(
            LambdaQueryWrapper<T> wrapper,
            SFunction<T, Instant> getter,
            FilterOperator operator,
            Object value) {
        switch (operator) {
            case EQ -> {
                Instant instant = asInstant(value);
                if (instant != null) {
                    wrapper.eq(getter, instant);
                }
            }
            case GTE -> {
                Instant instant = asInstant(value);
                if (instant != null) {
                    wrapper.ge(getter, instant);
                }
            }
            case LTE -> {
                Instant instant = asInstant(value);
                if (instant != null) {
                    wrapper.le(getter, instant);
                }
            }
            case BETWEEN -> {
                if (value instanceof List<?> values && values.size() == 2) {
                    Instant start = asInstant(values.get(0));
                    Instant end = asInstant(values.get(1));
                    if (start != null && end != null) {
                        wrapper.between(getter, start, end);
                    }
                }
            }
            default -> {
            }
        }
    }

    private static String asString(Object value) {
        if (value instanceof String text) {
            String trimmed = text.trim();
            return trimmed.isEmpty() ? null : trimmed;
        }
        return value == null ? null : String.valueOf(value);
    }

    private static Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Long.parseLong(text.trim());
        }
        return null;
    }

    private static Integer asInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Integer.parseInt(text.trim());
        }
        return null;
    }

    private static Instant asInstant(Object value) {
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Instant.parse(text.trim());
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
        return null;
    }
}
