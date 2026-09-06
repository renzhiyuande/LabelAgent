package com.labelhub.infra.business.export.support;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.LowCodeDtos.TreeOptionItem;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExportFieldCatalogSupportTest {

    @Mock
    private TaskMapper taskMapper;
    @Mock
    private TemplateVersionMapper templateVersionMapper;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ExportFieldCatalogSupport catalogSupport;

    @BeforeEach
    void setUp() {
        catalogSupport = new ExportFieldCatalogSupport(taskMapper, templateVersionMapper, objectMapper);
    }

    @Test
    void listsLifecycleTemplateAndReviewGroups() throws Exception {
        TaskEntity task = new TaskEntity();
        task.setId(910230000001L);
        task.setDeletedFlag(0);
        task.setCurrentTemplateVersionId(99L);
        when(taskMapper.selectById(910230000001L)).thenReturn(task);

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(99L);
        version.setDeletedFlag(0);
        version.setSchemaJson(objectMapper.writeValueAsString(java.util.Map.of(
                "sections",
                List.of(java.util.Map.of(
                        "key",
                        "main",
                        "fields",
                        List.of(
                                java.util.Map.of(
                                        "key",
                                        "prompt",
                                        "label",
                                        "题干",
                                        "component",
                                        "showItem",
                                        "readonly",
                                        true,
                                        "showItem",
                                        java.util.Map.of("contentSource", "payload")),
                                java.util.Map.of(
                                        "key",
                                        "answer",
                                        "path",
                                        "answer",
                                        "label",
                                        "答案",
                                        "component",
                                        "text")))))));
        when(templateVersionMapper.selectById(99L)).thenReturn(version);

        List<OptionItem> options = catalogSupport.listFieldOptions(910230000001L);
        String joined = options.stream().map(OptionItem::label).reduce("", String::concat);
        assertTrue(joined.contains("【生命周期】"));
        assertTrue(joined.contains("【题目展示】"));
        assertTrue(joined.contains("【标注作答】"));
        assertTrue(joined.contains("【审核】"));
        assertTrue(joined.contains("【题目展示】题干"));
        assertTrue(joined.contains("【标注作答】答案"));
        assertTrue(!joined.contains("sample_id"));
    }

    @Test
    void listsGroupedTreeOptions() throws Exception {
        TaskEntity task = new TaskEntity();
        task.setId(910230000001L);
        task.setDeletedFlag(0);
        task.setCurrentTemplateVersionId(99L);
        when(taskMapper.selectById(910230000001L)).thenReturn(task);

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(99L);
        version.setDeletedFlag(0);
        version.setSchemaJson(objectMapper.writeValueAsString(java.util.Map.of(
                "sections",
                List.of(java.util.Map.of(
                        "key",
                        "main",
                        "fields",
                        List.of(
                                java.util.Map.of(
                                        "key",
                                        "prompt",
                                        "label",
                                        "题干",
                                        "component",
                                        "showItem",
                                        "readonly",
                                        true,
                                        "showItem",
                                        java.util.Map.of("contentSource", "payload")),
                                java.util.Map.of(
                                        "key",
                                        "answer",
                                        "path",
                                        "answer",
                                        "label",
                                        "答案",
                                        "component",
                                        "text")))))));
        when(templateVersionMapper.selectById(99L)).thenReturn(version);

        List<TreeOptionItem> tree = catalogSupport.listFieldTreeOptions(910230000001L);
        assertTrue(tree.stream().anyMatch(group -> "生命周期".equals(group.label())));
        assertTrue(tree.stream().anyMatch(group -> "题目展示".equals(group.label())));
        assertTrue(tree.stream().anyMatch(group -> "标注作答".equals(group.label())));
        assertTrue(tree.stream().anyMatch(group -> "审核".equals(group.label())));

        TreeOptionItem payloadGroup = tree.stream()
                .filter(group -> "题目展示".equals(group.label()))
                .findFirst()
                .orElseThrow();
        assertTrue(payloadGroup.children().stream().anyMatch(item -> "题干".equals(item.label())));
    }
}
