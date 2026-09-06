package com.labelhub.infra.business.template.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.TemplateCreateCommand;
import com.labelhub.core.business.BusinessDtos.TemplateMarketSummary;
import com.labelhub.core.business.BusinessDtos.TemplateSummary;
import com.labelhub.core.business.BusinessDtos.TemplateVersionDraftSaveCommand;
import com.labelhub.core.business.BusinessDtos.TemplateVersionOwnerDetail;
import com.labelhub.core.business.BusinessDtos.TemplateVersionSummary;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.business.TemplateMarketService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateMarketMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import com.labelhub.infra.persistence.entity.TemplateMarketEntity;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — DbTemplatesService")
class DbTemplatesServiceWhiteBoxTest {

    @Mock
    private TemplatesMapper templatesMapper;
    @Mock
    private TemplateVersionMapper templateVersionMapper;
    @Mock
    private TemplateMarketMapper templateMarketMapper;
    @Mock
    private TaskService taskService;
    @Mock
    private TemplateMarketService templateMarketService;
    @Mock
    private MybatisQueryApplier queryApplier;
    @Mock
    private UserDisplayNameResolver userDisplayNameResolver;

    private DbTemplatesService service;

    @BeforeAll
    static void initMybatisPlusEntityMetadata() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant =
                new MapperBuilderAssistant(configuration, DbTemplatesServiceWhiteBoxTest.class.getName());
        TableInfoHelper.initTableInfo(assistant, TemplatesEntity.class);
        TableInfoHelper.initTableInfo(assistant, TemplateVersionEntity.class);
    }

    @BeforeEach
    void setUp() {
        service = new DbTemplatesService(
                templatesMapper,
                templateVersionMapper,
                templateMarketMapper,
                taskService,
                templateMarketService,
                () -> null,
                queryApplier,
                new ObjectMapper(),
                userDisplayNameResolver);
    }

    @Test
    @DisplayName("WB-TPL-001: createTemplate 写入 DRAFT 模板记录")
    void wbTpl001_createTemplateInsertsDraftRecord() {
        when(templatesMapper.selectCount(any())).thenReturn(0L);

        TemplateSummary summary = service.createTemplate(new TemplateCreateCommand(
                null, "P2_WB_TPL_NEW", "P2 Whitebox Template", "GENERAL", "test template"));

        assertThat(summary.templateCode()).isEqualTo("P2_WB_TPL_NEW");
        assertThat(summary.status()).isEqualTo("DRAFT");

        ArgumentCaptor<TemplatesEntity> captor = ArgumentCaptor.forClass(TemplatesEntity.class);
        verify(templatesMapper).insert(captor.capture());
        TemplatesEntity inserted = captor.getValue();
        assertThat(inserted.getTaskId()).isNull();
        assertThat(inserted.getLatestVersionNo()).isZero();
        assertThat(inserted.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    @DisplayName("WB-TPL-001: 关联任务创建模板时自动生成 v1 草稿")
    void wbTpl001_createTemplateWithTaskAutoCreatesDraftVersion() {
        when(templatesMapper.selectCount(any())).thenReturn(0L);
        when(templatesMapper.update(any(), any())).thenReturn(1);
        when(templatesMapper.updateById(any(TemplatesEntity.class))).thenReturn(1);
        when(templateVersionMapper.updateById(any(TemplateVersionEntity.class))).thenReturn(1);
        doAnswer(invocation -> {
            TemplatesEntity entity = invocation.getArgument(0);
            entity.setId(12001L);
            return 1;
        }).when(templatesMapper).insert(any(TemplatesEntity.class));

        TemplatesEntity template = templateEntity(12001L, 13001L);
        template.setTaskId(15001L);
        template.setTemplateCode("P2_WB_TPL_TASK");
        template.setTemplateName("Task Template");
        when(templatesMapper.selectById(12001L)).thenReturn(template);
        when(taskService.createDraftFromBase(15001L, null)).thenReturn(
                new TemplateVersionSummary(
                        13001L,
                        15001L,
                        1,
                        "Draft v1",
                        "DRAFT",
                        null,
                        null,
                        12001L,
                        null,
                        1,
                        null,
                        null,
                        null,
                        null));
        TemplateVersionEntity version = draftVersion(13001L, 12001L, 15001L);
        when(templateVersionMapper.selectById(13001L)).thenReturn(version);
        when(userDisplayNameResolver.resolve(null)).thenReturn("");

        TemplateSummary summary = service.createTemplate(new TemplateCreateCommand(
                15001L, "P2_WB_TPL_TASK", "Task Template", "GENERAL", "task bound"));

        assertThat(summary.templateCode()).isEqualTo("P2_WB_TPL_TASK");
        verify(taskService).createDraftFromBase(15001L, null);
    }

    @Test
    @DisplayName("WB-TPL-001: 重复 templateCode 拒绝创建")
    void wbTpl001_createTemplateRejectsDuplicateCode() {
        when(templatesMapper.selectCount(any())).thenReturn(1L);

        assertThatThrownBy(() -> service.createTemplate(new TemplateCreateCommand(
                        15001L, "P0_WB_TPL", "Duplicate", "GENERAL", null)))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).errorCode())
                        .isEqualTo(ErrorCode.TEMPLATE_CODE_DUPLICATE));
    }

    @Test
    @DisplayName("WB-TPL-002: saveVersionDraft 委托 TaskService 并更新当前版本")
    void wbTpl002_saveVersionDraftDelegatesAndSetsCurrentVersion() {
        TemplateVersionEntity version = draftVersion(13002L, 12001L, 15001L);
        when(templateVersionMapper.selectById(13002L)).thenReturn(version);
        TemplatesEntity template = templateEntity(12001L, 13001L);
        when(templatesMapper.selectById(12001L)).thenReturn(template);
        when(userDisplayNameResolver.resolve(null)).thenReturn("");

        when(taskService.saveDraft(org.mockito.ArgumentMatchers.eq(13002L), any(), any(), any()))
                .thenReturn(null);

        String schemaJson = """
                {"schemaFormat":"form_schema_v1","sections":[{"title":"Main","fields":[{"key":"label_text","component":"text"}]}]}
                """;
        TemplateVersionOwnerDetail detail = service.saveVersionDraft(
                13002L, new TemplateVersionDraftSaveCommand(schemaJson, "review prompt", null));

        assertThat(detail.id()).isEqualTo(13002L);
        verify(taskService).saveDraft(org.mockito.ArgumentMatchers.eq(13002L), any(Map.class), any(), any());
        ArgumentCaptor<TemplatesEntity> captor = ArgumentCaptor.forClass(TemplatesEntity.class);
        verify(templatesMapper).updateById(captor.capture());
        assertThat(captor.getValue().getCurrentTemplateVersionId()).isEqualTo(13002L);
    }

    @Test
    @DisplayName("WB-TPL-003: publishTemplateVersion 发布并递增 latest_version_no")
    void wbTpl003_publishTemplateVersionUpdatesCurrentAndVersionNo() {
        TemplateVersionEntity version = draftVersion(13003L, 12001L, 15001L);
        when(templateVersionMapper.selectById(13003L)).thenReturn(version);
        TemplatesEntity template = templateEntity(12001L, 13001L);
        when(templatesMapper.selectById(12001L)).thenReturn(template);
        when(userDisplayNameResolver.resolve(null)).thenReturn("");

        TemplateVersionSummary published = new TemplateVersionSummary(
                13003L, 15001L, 2, "P0 v2", "PUBLISHED", Instant.now(), Instant.now(),
                12001L, null, 1, null, "", null, null);
        when(taskService.publishVersion(13003L)).thenReturn(published);

        DbTemplatesService spyService = Mockito.spy(service);
        Mockito.doNothing().when(spyService).incrementLatestVersionNo(12001L);

        TemplateVersionSummary summary = spyService.publishTemplateVersion(13003L);

        assertThat(summary.id()).isEqualTo(13003L);
        assertThat(published.status()).isEqualTo("PUBLISHED");
        verify(taskService).publishVersion(13003L);
        verify(spyService).incrementLatestVersionNo(12001L);
    }

    @Test
    @DisplayName("WB-TPL-004: submitTemplateVersionToMarket 写入市场待审记录")
    void wbTpl004_submitTemplateVersionToMarketDelegatesToMarketService() {
        TemplateVersionEntity version = publishedVersion(13004L, 12001L, 15001L);
        when(templateVersionMapper.selectById(13004L)).thenReturn(version);
        TemplatesEntity template = templateEntity(12001L, 13004L);
        when(templatesMapper.selectById(12001L)).thenReturn(template);
        when(userDisplayNameResolver.resolve(null)).thenReturn("");

        TemplateMarketSummary marketSummary = new TemplateMarketSummary(
                50001L, "P0_WB_TPL", "P0 Template", "desc", "GENERAL",
                0, 0, java.math.BigDecimal.ZERO, 0, "PENDING", "OFFLINE", Instant.now(),
                false, null, null);
        when(templateMarketService.submitForReview(13004L, "market desc")).thenReturn(marketSummary);
        TemplateMarketEntity marketEntity = new TemplateMarketEntity();
        marketEntity.setId(50001L);
        marketEntity.setTemplateVersionId(13004L);
        marketEntity.setAuditStatus("PENDING");
        marketEntity.setDeletedFlag(0);
        when(templateMarketMapper.selectList(any())).thenReturn(java.util.List.of(marketEntity));

        TemplateVersionSummary summary = service.submitTemplateVersionToMarket(13004L, "market desc");

        assertThat(summary.marketAuditStatus()).isEqualTo("PENDING");
        verify(templateMarketService).submitForReview(13004L, "market desc");
    }

    @Test
    @DisplayName("WB-TPL-006: activateTemplateVersion 切换当前版本指针")
    void wbTpl006_activateTemplateVersionSetsCurrentPointer() {
        TemplateVersionEntity version = publishedVersion(13005L, 12001L, 15001L);
        when(templateVersionMapper.selectById(13005L)).thenReturn(version);
        TemplatesEntity template = templateEntity(12001L, 13001L);
        when(templatesMapper.selectById(12001L)).thenReturn(template);

        service.activateTemplateVersion(13005L);

        verify(taskService).setAsCurrent(13005L);
        ArgumentCaptor<TemplatesEntity> captor = ArgumentCaptor.forClass(TemplatesEntity.class);
        verify(templatesMapper).updateById(captor.capture());
        assertThat(captor.getValue().getCurrentTemplateVersionId()).isEqualTo(13005L);
        assertThat(captor.getValue().getStatus()).isEqualTo("ACTIVE");
    }

    private static TemplateVersionEntity draftVersion(long id, long templateId, long taskId) {
        TemplateVersionEntity entity = new TemplateVersionEntity();
        entity.setId(id);
        entity.setTemplateId(templateId);
        entity.setTaskId(taskId);
        entity.setVersionNo(2);
        entity.setTemplateName("P0 v2");
        entity.setStatus("DRAFT");
        entity.setIsCurrent(0);
        entity.setSchemaJson("{\"sections\":[]}");
        entity.setDeletedFlag(0);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        return entity;
    }

    private static TemplateVersionEntity publishedVersion(long id, long templateId, long taskId) {
        TemplateVersionEntity entity = draftVersion(id, templateId, taskId);
        entity.setStatus("PUBLISHED");
        entity.setPublishedAt(Instant.now());
        return entity;
    }

    private static TemplatesEntity templateEntity(long id, long currentVersionId) {
        TemplatesEntity entity = new TemplatesEntity();
        entity.setId(id);
        entity.setTaskId(15001L);
        entity.setTemplateCode("P0_WB_TPL");
        entity.setTemplateName("P0 Template");
        entity.setSceneCode("GENERAL");
        entity.setCurrentTemplateVersionId(currentVersionId);
        entity.setLatestVersionNo(1);
        entity.setStatus("DRAFT");
        entity.setDeletedFlag(0);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        return entity;
    }
}
