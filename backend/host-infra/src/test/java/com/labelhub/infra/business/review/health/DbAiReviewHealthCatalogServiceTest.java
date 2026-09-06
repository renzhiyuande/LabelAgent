package com.labelhub.infra.business.review.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.review.AiReviewHealthCatalogItem;
import com.labelhub.core.review.AiReviewHealthCatalogPage;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("DbAiReviewHealthCatalogService whitebox")
class DbAiReviewHealthCatalogServiceTest {

    @Mock
    private TemplatesMapper templatesMapper;

    @Mock
    private TaskMapper taskMapper;

    private DbAiReviewHealthCatalogService service;

    @BeforeEach
    void setUp() {
        service = new DbAiReviewHealthCatalogService(templatesMapper, taskMapper);
    }

    @Test
    void listCatalog_returnsPagedItemsWithTaskMetadata() {
        TemplatesEntity template = template(11L, 101L, "tpl-a", "模板 A");
        TaskEntity task = task(101L, "任务一", "TASK-001");

        Page<TemplatesEntity> page = new Page<>(1, 20, 1);
        page.setRecords(List.of(template));
        when(templatesMapper.selectPage(any(Page.class), any())).thenReturn(page);
        when(taskMapper.selectList(any())).thenReturn(List.of(task));

        AiReviewHealthCatalogPage result = service.listCatalog(1, 20, null, null);

        assertThat(result.total()).isEqualTo(1);
        assertThat(result.list()).containsExactly(
                new AiReviewHealthCatalogItem(101L, "任务一", "TASK-001", 11L, "模板 A", "tpl-a"));
    }

    @Test
    void listCatalog_pinsIncludeTemplateWhenMissingFromPage() {
        TemplatesEntity pageTemplate = template(12L, 102L, "tpl-b", "模板 B");
        TemplatesEntity pinnedTemplate = template(99L, 103L, "tpl-z", "模板 Z");
        TaskEntity pageTask = task(102L, "任务二", "TASK-002");
        TaskEntity pinnedTask = task(103L, "任务三", "TASK-003");

        Page<TemplatesEntity> page = new Page<>(1, 20, 1);
        page.setRecords(List.of(pageTemplate));
        when(templatesMapper.selectPage(any(Page.class), any())).thenReturn(page);
        when(templatesMapper.selectById(99L)).thenReturn(pinnedTemplate);
        when(taskMapper.selectById(103L)).thenReturn(pinnedTask);
        when(taskMapper.selectList(any())).thenReturn(List.of(pageTask));

        AiReviewHealthCatalogPage result = service.listCatalog(1, 20, null, 99L);

        assertThat(result.list()).hasSize(2);
        assertThat(result.list().get(0).templateId()).isEqualTo(99L);
        assertThat(result.list().get(1).templateId()).isEqualTo(12L);
    }

    @Test
    void listCatalog_appliesKeywordByQueryingMatchingTasks() {
        TemplatesEntity template = template(21L, 201L, "tpl-c", "模板 C");
        TaskEntity task = task(201L, "搜索任务", "SEARCH-001");

        Page<TemplatesEntity> page = new Page<>(1, 20, 1);
        page.setRecords(List.of(template));
        when(taskMapper.selectList(any())).thenReturn(List.of(task));
        when(templatesMapper.selectPage(any(Page.class), any())).thenReturn(page);

        AiReviewHealthCatalogPage result = service.listCatalog(1, 20, "搜索任务", null);

        assertThat(result.list()).hasSize(1);
        verify(taskMapper, times(2)).selectList(any());
        verify(templatesMapper).selectPage(any(Page.class), any());
    }

    private static TemplatesEntity template(Long id, Long taskId, String code, String name) {
        TemplatesEntity entity = new TemplatesEntity();
        entity.setId(id);
        entity.setTaskId(taskId);
        entity.setTemplateCode(code);
        entity.setTemplateName(name);
        entity.setDeletedFlag(0);
        return entity;
    }

    private static TaskEntity task(Long id, String title, String code) {
        TaskEntity entity = new TaskEntity();
        entity.setId(id);
        entity.setTitle(title);
        entity.setTaskCode(code);
        entity.setDeletedFlag(0);
        return entity;
    }
}
