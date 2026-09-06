package com.labelhub.core.lowcode.query;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.labelhub.core.lowcode.LowCodeDtos.FilterRule;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.LowCodeDtos.SortRule;
import java.util.List;
import org.junit.jupiter.api.Test;

class ListQueryParserTest {
    private final ListQueryParser parser = new ListQueryParser();

    @Test
    void parseNormalizesKeywordFilterAndSort() {
        ParsedListQuery parsed = parser.parse(new ListQuery(
                0,
                999,
                List.of(new SortRule("id", "desc")),
                List.of(
                        new FilterRule("keyword", "like", " admin "),
                        new FilterRule("status", "eq", "ACTIVE"))));

        assertEquals(1, parsed.page());
        assertEquals(100, parsed.pageSize());
        assertEquals("admin", parsed.keyword());
        assertEquals(1, parsed.filters().size());
        assertEquals("status", parsed.filters().get(0).field());
        assertEquals(FilterOperator.EQ, parsed.filters().get(0).operator());
        assertEquals("ACTIVE", parsed.filters().get(0).value());
        assertEquals("id", parsed.sort().get(0).field());
    }

    @Test
    void parseAcceptsBetweenFilterValueArray() {
        ParsedListQuery parsed = parser.parse(new ListQuery(
                1,
                10,
                List.of(),
                List.of(new FilterRule("occurredAt", "between", List.of("2026-01-01", "2026-01-31")))));

        ParsedFilter filter = parsed.filters().get(0);
        assertEquals(FilterOperator.BETWEEN, filter.operator());
        assertEquals(List.of("2026-01-01", "2026-01-31"), filter.value());
    }

    @Test
    void parseRejectsInvalidBetweenValue() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse(new ListQuery(
                1,
                10,
                List.of(),
                List.of(new FilterRule("occurredAt", "between", "2026-01-01")))));
    }
}
