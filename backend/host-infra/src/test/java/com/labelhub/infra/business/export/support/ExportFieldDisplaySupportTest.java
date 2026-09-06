package com.labelhub.infra.business.export.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.system.admin.DictAdminService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExportFieldDisplaySupportTest {

    @Mock
    private TaskMapper taskMapper;
    @Mock
    private TemplateVersionMapper templateVersionMapper;
    @Mock
    private DictAdminService dictAdminService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ExportFieldDisplaySupport displaySupport;

    @BeforeEach
    void setUp() {
        displaySupport = new ExportFieldDisplaySupport(
                taskMapper, templateVersionMapper, dictAdminService, objectMapper);
    }

    @Test
    void mapsStatusDictAndTemplateHeaders() throws Exception {
        TaskEntity task = new TaskEntity();
        task.setId(1L);
        task.setDeletedFlag(0);
        task.setCurrentTemplateVersionId(9L);
        when(taskMapper.selectById(1L)).thenReturn(task);

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(9L);
        version.setDeletedFlag(0);
        version.setSchemaJson(objectMapper.writeValueAsString(Map.of(
                "sections",
                List.of(Map.of(
                        "fields",
                        List.of(Map.of(
                                "key",
                                "preferred",
                                "label",
                                "偏好结果",
                                "component",
                                "select",
                                "options",
                                List.of(
                                        Map.of("label", "A 更好", "value", "A"),
                                        Map.of("label", "B 更好", "value", "B")))))))));
        when(templateVersionMapper.selectById(9L)).thenReturn(version);
        when(dictAdminService.getActiveDictOptions(eq("submission_status")))
                .thenReturn(List.of(new OptionItem("已通过", "APPROVED", null, null)));

        ExportFieldDisplaySupport.DisplayContext display = displaySupport.buildContext(
                1L, List.of("lifecycle.status", "annotate.preferred"));

        assertEquals("【生命周期】提交状态", display.headerFor("lifecycle.status"));
        assertEquals("【标注作答】偏好结果", display.headerFor("annotate.preferred"));
        assertEquals("已通过", display.formatValue("lifecycle.status", "APPROVED"));
        assertEquals("A 更好", display.formatValue("annotate.preferred", "A"));
    }
}
