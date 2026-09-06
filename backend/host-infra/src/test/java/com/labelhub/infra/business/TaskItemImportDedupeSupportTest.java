package com.labelhub.infra.business;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.labelhub.infra.business.task.support.TaskItemImportDedupeSupport;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TaskItemImportDedupeSupportTest {

    @Test
    void detectsIdColumn() {
        assertEquals("id", TaskItemImportDedupeSupport.detectDefaultSourceKeyField(
                List.of(Map.of("id", "A1", "prompt", "x"))));
        assertEquals("ID", TaskItemImportDedupeSupport.detectDefaultSourceKeyField(
                List.of(Map.of("ID", "B2"))));
    }

    @Test
    void returnsNullWhenNoDefaultColumn() {
        assertNull(TaskItemImportDedupeSupport.detectDefaultSourceKeyField(
                List.of(Map.of("prompt", "only"))));
    }

    @Test
    void resolvesBusinessAndHashKeys() {
        assertEquals("biz:sample-1", TaskItemImportDedupeSupport.resolveSourceItemKey(
                Map.of("id", "sample-1"), "id", "abc123"));
        assertEquals("hash:abc123", TaskItemImportDedupeSupport.resolveSourceItemKey(
                Map.of("prompt", "x"), TaskItemImportDedupeSupport.CONTENT_HASH_SOURCE_KEY, "abc123"));
    }
}
