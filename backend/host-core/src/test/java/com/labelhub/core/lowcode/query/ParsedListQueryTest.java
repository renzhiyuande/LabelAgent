package com.labelhub.core.lowcode.query;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class ParsedListQueryTest {

    @Test
    void normalizesPageAndCapsPageSize() {
        ParsedListQuery query = new ParsedListQuery(0, 999, null, List.of(), List.of());

        assertEquals(1, query.page());
        assertEquals(ParsedListQuery.MAX_PAGE_SIZE, query.pageSize());
    }

    @Test
    void usesDefaultPageSizeWhenInvalid() {
        ParsedListQuery query = new ParsedListQuery(2, 0, null, List.of(), List.of());

        assertEquals(2, query.page());
        assertEquals(ParsedListQuery.DEFAULT_PAGE_SIZE, query.pageSize());
    }
}
