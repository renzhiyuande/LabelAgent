package com.labelhub.infra.notification.support;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class MentionTextSupportTest {
    @Test
    void extractsMentionLabels() {
        List<String> labels = MentionTextSupport.extractMentionLabels("请 @张三 与 @lisi 查看");
        assertEquals(List.of("张三", "lisi"), labels);
    }
}
