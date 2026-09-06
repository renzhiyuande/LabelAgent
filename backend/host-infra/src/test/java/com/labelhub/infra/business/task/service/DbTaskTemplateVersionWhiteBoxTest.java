package com.labelhub.infra.business.task.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.VersionDiffResult;
import com.labelhub.core.business.VersionDiffService;
import com.labelhub.infra.business.distribute.DistributeStrategyRegistry;
import com.labelhub.infra.business.review.support.ReviewWorkflowResolver;
import com.labelhub.infra.business.review.support.ReviewWorkflowValidator;
import com.labelhub.infra.business.task.support.TaskTemplateCloneSupport;
import com.labelhub.infra.business.display.assembler.SubmissionTimelineAssembler;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.TaskItemImportBatchMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateReviewDimensionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionFieldMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("P2 白盒 — DbTaskService 模板版本")
class DbTaskTemplateVersionWhiteBoxTest {

    @Mock
    private TaskMapper taskMapper;
    @Mock
    private TaskItemMapper taskItemMapper;
    @Mock
    private AssignmentMapper assignmentMapper;
    @Mock
    private TaskItemImportBatchMapper taskItemImportBatchMapper;
    @Mock
    private TemplateVersionMapper templateVersionMapper;
    @Mock
    private TemplateVersionFieldMapper templateVersionFieldMapper;
    @Mock
    private TemplatesMapper templatesMapper;
    @Mock
    private TemplateReviewDimensionMapper templateReviewDimensionMapper;
    @Mock
    private MybatisQueryApplier queryApplier;
    @Mock
    private DistributeStrategyRegistry distributeStrategyRegistry;
    @Mock
    private UserDisplayNameResolver userDisplayNameResolver;
    @Mock
    private SubmissionTimelineAssembler submissionTimelineAssembler;
    @Mock
    private ReviewWorkflowResolver reviewWorkflowResolver;
    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private TaskTemplateCloneSupport taskTemplateCloneSupport;

    private DbTaskService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        ReviewWorkflowValidator reviewWorkflowValidator =
                new ReviewWorkflowValidator(objectMapper, reviewWorkflowResolver);
        when(reviewWorkflowResolver.parseDefinition(any())).thenReturn(List.of());
        when(userDisplayNameResolver.resolve(any())).thenReturn("");
        when(templateVersionFieldMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());
        when(templateReviewDimensionMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        service = new DbTaskService(
                taskMapper,
                taskItemMapper,
                assignmentMapper,
                taskItemImportBatchMapper,
                templateVersionMapper,
                templateVersionFieldMapper,
                templatesMapper,
                templateReviewDimensionMapper,
                currentUserContext,
                objectMapper,
                queryApplier,
                distributeStrategyRegistry,
                userDisplayNameResolver,
                submissionTimelineAssembler,
                reviewWorkflowResolver,
                reviewWorkflowValidator,
                taskTemplateCloneSupport);
    }

    @Test
    @DisplayName("WB-TPL-002: saveDraft 持久化 schema 并同步字段表")
    void wbTpl002_saveDraftPersistsSchemaAndSyncsFields() {
        TemplateVersionEntity draft = draftVersion(13010L);
        when(templateVersionMapper.selectById(13010L)).thenReturn(draft);

        Map<String, Object> schema = Map.of(
                "schemaFormat", "form_schema_v1",
                "sections", List.of(Map.of(
                        "title", "Main",
                        "fields", List.of(Map.of(
                                "key", "label_text",
                                "path", "label_text",
                                "component", "text")))));

        service.saveDraft(13010L, schema, "review prompt", null);

        assertThat(draft.getSchemaJson()).contains("label_text");
        assertThat(draft.getReviewPromptTemplate()).isEqualTo("review prompt");
        verify(templateVersionMapper).updateById(draft);
        verify(templateVersionFieldMapper).delete(any(LambdaQueryWrapper.class));
        verify(templateVersionFieldMapper)
                .insert(org.mockito.ArgumentMatchers.<com.labelhub.infra.persistence.entity.TemplateVersionFieldEntity>any());
    }

    @Test
    @DisplayName("WB-TPL-003: publishVersion 状态变为 PUBLISHED 并清除其他 is_current")
    void wbTpl003_publishVersionMarksPublishedAndSingleCurrent() {
        TemplateVersionEntity draft = draftVersion(13011L);
        TemplateVersionEntity otherCurrent = draftVersion(13012L);
        otherCurrent.setIsCurrent(1);
        when(templateVersionMapper.selectById(13011L)).thenReturn(draft);
        when(templateVersionMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(otherCurrent));

        service.publishVersion(13011L);

        assertThat(draft.getStatus()).isEqualTo("PUBLISHED");
        assertThat(draft.getIsCurrent()).isEqualTo(1);
        assertThat(otherCurrent.getIsCurrent()).isEqualTo(0);
        verify(templateVersionMapper).updateById(draft);
        verify(templateVersionMapper).updateById(otherCurrent);
    }

    @Test
    @DisplayName("WB-TPL-006: setAsCurrent 仅保留一个 is_current=1")
    void wbTpl006_setAsCurrentKeepsSingleCurrentFlag() {
        TemplateVersionEntity target = publishedVersion(13013L);
        TemplateVersionEntity other = publishedVersion(13014L);
        other.setIsCurrent(1);
        when(templateVersionMapper.selectById(13013L)).thenReturn(target);
        when(templateVersionMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(other));

        service.setAsCurrent(13013L);

        assertThat(target.getIsCurrent()).isEqualTo(1);
        assertThat(other.getIsCurrent()).isEqualTo(0);
    }

    @Test
    @DisplayName("WB-TPL-007: compareVersions 返回新增/删除字段 diff")
    void wbTpl007_compareVersionsReturnsFieldDiff() {
        TemplateVersionEntity v1 = versionWithSchema(13015L, "{\"properties\":{\"field_a\":{\"title\":\"A\"}}}");
        TemplateVersionEntity v2 = versionWithSchema(13016L, "{\"properties\":{\"field_b\":{\"title\":\"B\"}}}");
        when(templateVersionMapper.selectById(13015L)).thenReturn(v1);
        when(templateVersionMapper.selectById(13016L)).thenReturn(v2);

        VersionDiffResult diff = service.compareVersions(13015L, 13016L);

        assertThat(diff.v1Id()).isEqualTo(13015L);
        assertThat(diff.v2Id()).isEqualTo(13016L);
        assertThat(diff.addedFields()).isNotEmpty();
        assertThat(diff.removedFields()).isNotEmpty();
        VersionDiffService.DiffResult expected = VersionDiffService.compareSchemas(
                13015L,
                13016L,
                Map.of("field_a", Map.of("title", "A")),
                Map.of("field_b", Map.of("title", "B")));
        assertThat(diff.addedFields()).hasSameSizeAs(expected.addedFields());
        assertThat(diff.removedFields()).hasSameSizeAs(expected.removedFields());
    }

    private static TemplateVersionEntity draftVersion(long id) {
        TemplateVersionEntity entity = new TemplateVersionEntity();
        entity.setId(id);
        entity.setTaskId(15001L);
        entity.setVersionNo(2);
        entity.setTemplateName("draft");
        entity.setStatus("DRAFT");
        entity.setIsCurrent(0);
        entity.setSchemaJson("{\"sections\":[]}");
        entity.setDeletedFlag(0);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        return entity;
    }

    private static TemplateVersionEntity publishedVersion(long id) {
        TemplateVersionEntity entity = draftVersion(id);
        entity.setStatus("PUBLISHED");
        entity.setPublishedAt(Instant.now());
        return entity;
    }

    private static TemplateVersionEntity versionWithSchema(long id, String schemaJson) {
        TemplateVersionEntity entity = publishedVersion(id);
        entity.setSchemaJson(schemaJson);
        return entity;
    }
}
