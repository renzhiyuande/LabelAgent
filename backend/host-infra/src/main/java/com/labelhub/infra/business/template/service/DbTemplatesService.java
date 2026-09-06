package com.labelhub.infra.business.template.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.business.TemplateMarketService;
import com.labelhub.core.business.TemplatesService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.TemplateQuerySpec;
import com.labelhub.infra.lowcode.query.spec.TemplateVersionQuerySpec;
import com.labelhub.infra.persistence.entity.TemplateMarketEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.TemplateMarketMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbTemplatesService implements TemplatesService {
    private static final ResourceQuerySpec<TemplatesEntity> QUERY_SPEC = TemplateQuerySpec.build();
    private static final ResourceQuerySpec<TemplateVersionEntity> VERSION_QUERY_SPEC = TemplateVersionQuerySpec.build();

    private final TemplatesMapper templatesMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final TemplateMarketMapper templateMarketMapper;
    private final TaskService taskService;
    private final TemplateMarketService templateMarketService;
    private final CurrentUserProvider currentUserProvider;
    private final MybatisQueryApplier queryApplier;
    private final ObjectMapper objectMapper;
    private final UserDisplayNameResolver userDisplayNameResolver;

    public DbTemplatesService(
            TemplatesMapper templatesMapper,
            TemplateVersionMapper templateVersionMapper,
            TemplateMarketMapper templateMarketMapper,
            TaskService taskService,
            TemplateMarketService templateMarketService,
            CurrentUserProvider currentUserProvider,
            MybatisQueryApplier queryApplier,
            ObjectMapper objectMapper,
            UserDisplayNameResolver userDisplayNameResolver) {
        this.templatesMapper = templatesMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.templateMarketMapper = templateMarketMapper;
        this.taskService = taskService;
        this.templateMarketService = templateMarketService;
        this.currentUserProvider = currentUserProvider;
        this.queryApplier = queryApplier;
        this.objectMapper = objectMapper;
        this.userDisplayNameResolver = userDisplayNameResolver;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public PageResponse<TemplateSummary> listTemplates(ParsedListQuery query) {
        LambdaQueryWrapper<TemplatesEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        queryApplier.apply(wrapper, query, QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(TemplatesEntity::getCreatedAt);
        }
        IPage<TemplatesEntity> pageResult = templatesMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(this::toSummary).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public PageResponse<TemplateSummary> listTemplatesByTaskId(Long taskId, ParsedListQuery query) {
        LambdaQueryWrapper<TemplatesEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        wrapper.eq(TemplatesEntity::getTaskId, taskId);
        queryApplier.apply(wrapper, query, QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(TemplatesEntity::getCreatedAt);
        }
        IPage<TemplatesEntity> pageResult = templatesMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(this::toSummary).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public TemplateDetail getTemplateDetail(Long templateId) {
        TemplatesEntity entity = requireTemplate(templateId);
        return new TemplateDetail(entity.getId(), entity.getTaskId(), entity.getTemplateCode(),
                entity.getTemplateName(), entity.getSceneCode(), entity.getDescriptionText(),
                entity.getCurrentTemplateVersionId(), entity.getLatestVersionNo(),
                entity.getStatus(), entity.getCreatedAt());
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:create" })
    @Audit(entityType = "TEMPLATE", actionCode = "template.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public TemplateSummary createTemplate(TemplateCreateCommand command) {
        if (command.taskId() != null) {
            LambdaQueryWrapper<TemplatesEntity> taskBoundWrapper = new LambdaQueryWrapper<>();
            taskBoundWrapper.eq(TemplatesEntity::getDeletedFlag, 0);
            taskBoundWrapper.eq(TemplatesEntity::getTaskId, command.taskId());
            Long boundCount = templatesMapper.selectCount(taskBoundWrapper);
            if (boundCount != null && boundCount > 0) {
                throw new BusinessException(ErrorCode.TEMPLATE_CODE_DUPLICATE,
                        "Task already has a template master record");
            }
        }
        LambdaQueryWrapper<TemplatesEntity> checkWrapper = new LambdaQueryWrapper<>();
        checkWrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        if (command.taskId() != null) {
            checkWrapper.eq(TemplatesEntity::getTaskId, command.taskId());
        } else {
            checkWrapper.isNull(TemplatesEntity::getTaskId);
        }
        checkWrapper.eq(TemplatesEntity::getTemplateCode, command.templateCode());
        Long existingCount = templatesMapper.selectCount(checkWrapper);
        if (existingCount != null && existingCount > 0) {
            throw new BusinessException(ErrorCode.TEMPLATE_CODE_DUPLICATE);
        }

        TemplatesEntity entity = new TemplatesEntity();
        entity.setTaskId(command.taskId());
        entity.setTemplateCode(command.templateCode() != null ? command.templateCode()
                : "TEMPLATE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        entity.setTemplateName(command.templateName());
        entity.setSceneCode(command.sceneCode() != null ? command.sceneCode() : "GENERAL");
        entity.setDescriptionText(command.descriptionText());
        entity.setLatestVersionNo(0);
        entity.setStatus("DRAFT");
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        templatesMapper.insert(entity);
        if (command.taskId() != null) {
            createDraftVersion(entity.getId(), null);
            entity = requireTemplate(entity.getId());
        }
        return toSummary(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "TEMPLATE", actionCode = "template.update", entityId = "#templateId")
    public TemplateSummary updateTemplate(Long templateId, TemplateUpdateCommand command) {
        TemplatesEntity entity = requireTemplate(templateId);
        entity.setTemplateName(command.templateName());
        entity.setTaskId(command.taskId() != null ? command.taskId() : null);
        entity.setDescriptionText(command.descriptionText());
        entity.setUpdatedAt(Instant.now());
        templatesMapper.updateById(entity);
        return toSummary(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:delete" })
    @Audit(entityType = "TEMPLATE", actionCode = "template.delete", entityId = "#templateId")
    public void deleteTemplate(Long templateId) {
        TemplatesEntity entity = requireTemplate(templateId);
        entity.setDeletedFlag(1);
        entity.setUpdatedAt(Instant.now());
        templatesMapper.updateById(entity);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:template:read", "business:task:read" })
    public PageResponse<TemplateVersionSummary> listTemplateVersions(Long templateId, ParsedListQuery query) {
        TemplatesEntity template = requireTemplate(templateId);
        LambdaQueryWrapper<TemplateVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateVersionEntity::getDeletedFlag, 0);
        wrapper.and(w -> {
            w.eq(TemplateVersionEntity::getTemplateId, templateId);
            if (template.getTaskId() != null) {
                w.or(nested -> nested.isNull(TemplateVersionEntity::getTemplateId)
                        .eq(TemplateVersionEntity::getTaskId, template.getTaskId()));
            }
        });
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(TemplateVersionEntity::getVersionNo);
        }
        queryApplier.apply(wrapper, query, VERSION_QUERY_SPEC);
        IPage<TemplateVersionEntity> pageResult = templateVersionMapper
                .selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        Long currentVersionId = template.getCurrentTemplateVersionId();
        Map<Long, TemplateMarketEntity> marketByVersionId = loadTemplateMarketByVersionIds(pageResult.getRecords());
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream()
                        .map(entity -> toVersionSummary(entity, currentVersionId, marketByVersionId.get(entity.getId())))
                        .toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:template:read", "business:task:read" })
    public TemplateVersionOwnerDetail getTemplateVersionDetail(Long versionId) {
        TemplateVersionEntity entity = requireVersion(versionId);
        return toOwnerDetail(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:template:create", "business:task:template_save",
            "business:template:manage" })
    public TemplateVersionSummary createDraftVersion(Long templateId, Long baseVersionId) {
        TemplatesEntity template = requireTemplate(templateId);
        TemplateVersionSummary created;
        if (template.getTaskId() != null) {
            created = taskService.createDraftFromBase(template.getTaskId(), baseVersionId);
        } else {
            created = createStandaloneDraft(template, baseVersionId);
        }
        TemplateVersionEntity version = requireVersion(created.id());
        version.setTemplateId(templateId);
        version.setUpdatedAt(Instant.now());
        templateVersionMapper.updateById(version);
        setCurrentVersion(templateId, created.id());
        incrementLatestVersionNo(templateId);
        return toVersionSummary(version, created.id());
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:task:template_save",
            "business:template:manage" })
    public TemplateVersionOwnerDetail saveVersionDraft(Long versionId, TemplateVersionDraftSaveCommand command) {
        Map<String, Object> schema = parseSchemaJson(command.schemaJson());
        taskService.saveDraft(versionId, schema, command.reviewPromptTemplate(), command.dimensions());
        TemplateVersionEntity entity = requireVersion(versionId);
        Long templateId = resolveTemplateId(entity);
        if (templateId != null) {
            setCurrentVersion(templateId, versionId);
        }
        return toOwnerDetail(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:task:publish" })
    public TemplateVersionSummary publishTemplateVersion(Long versionId) {
        TemplateVersionSummary published = taskService.publishVersion(versionId);
        TemplateVersionEntity version = requireVersion(versionId);
        Long templateId = resolveTemplateId(version);
        if (templateId != null) {
            setCurrentVersion(templateId, versionId);
            incrementLatestVersionNo(templateId);
        }
        return toVersionSummary(version, versionId);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:template:update", "template:market:publish" })
    public TemplateVersionSummary submitTemplateVersionToMarket(Long versionId, String description) {
        templateMarketService.submitForReview(versionId, description);
        TemplateVersionEntity version = requireVersion(versionId);
        Long templateId = resolveTemplateId(version);
        Long currentVersionId = templateId != null ? requireTemplate(templateId).getCurrentTemplateVersionId() : null;
        TemplateMarketEntity marketEntity = loadTemplateMarketByVersionIds(List.of(version)).get(versionId);
        return toVersionSummary(version, currentVersionId, marketEntity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:template:update", "business:task:update" })
    public void activateTemplateVersion(Long versionId) {
        taskService.setAsCurrent(versionId);
        TemplateVersionEntity version = requireVersion(versionId);
        Long templateId = resolveTemplateId(version);
        if (templateId != null) {
            setCurrentVersion(templateId, versionId);
        }
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    public void incrementLatestVersionNo(Long templateId) {
        LambdaUpdateWrapper<TemplatesEntity> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(TemplatesEntity::getId, templateId);
        wrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        wrapper.setSql("latest_version_no = latest_version_no + 1");
        wrapper.set(TemplatesEntity::getUpdatedAt, Instant.now());
        int affected = templatesMapper.update(null, wrapper);
        if (affected == 0) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
        }
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    public void setCurrentVersion(Long templateId, Long versionId) {
        TemplatesEntity template = requireTemplate(templateId);
        TemplateVersionEntity version = requireVersion(versionId);
        template.setCurrentTemplateVersionId(versionId);
        if ("PUBLISHED".equals(version.getStatus())) {
            template.setStatus("ACTIVE");
        }
        template.setUpdatedAt(Instant.now());
        templatesMapper.updateById(template);
    }

    private TemplateVersionSummary createStandaloneDraft(TemplatesEntity template, Long baseVersionId) {
        TemplateVersionEntity baseVersion = null;
        if (baseVersionId != null) {
            baseVersion = templateVersionMapper.selectById(baseVersionId);
            if (baseVersion == null || baseVersion.getDeletedFlag() == 1) {
                throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
            }
        }
        LambdaQueryWrapper<TemplateVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateVersionEntity::getTemplateId, template.getId());
        wrapper.eq(TemplateVersionEntity::getDeletedFlag, 0);
        wrapper.orderByDesc(TemplateVersionEntity::getVersionNo);
        wrapper.last("LIMIT 1");
        TemplateVersionEntity lastVersion = templateVersionMapper.selectOne(wrapper);
        int nextVersionNo = lastVersion == null ? 1 : lastVersion.getVersionNo() + 1;

        TemplateVersionEntity newVersion = new TemplateVersionEntity();
        newVersion.setTemplateId(template.getId());
        newVersion.setTaskId(template.getTaskId());
        newVersion.setVersionNo(nextVersionNo);
        newVersion.setTemplateName(template.getTemplateName() + " v" + nextVersionNo);
        newVersion.setStatus("DRAFT");
        newVersion.setIsCurrent(1);
        if (baseVersion != null) {
            newVersion.setSchemaJson(baseVersion.getSchemaJson());
            newVersion.setSchemaChecksum(baseVersion.getSchemaChecksum());
        } else {
            newVersion.setSchemaJson("{\"schemaFormat\":\"form_schema_v1\",\"sections\":[],\"actions\":[]}");
            newVersion.setSchemaChecksum("");
        }
        newVersion.setWidgetCount(0);
        newVersion.setRequiredFieldCount(0);
        newVersion.setCreatedAt(Instant.now());
        newVersion.setUpdatedAt(Instant.now());
        templateVersionMapper.insert(newVersion);
        return toVersionSummary(newVersion, newVersion.getId());
    }

    private Map<String, Object> parseSchemaJson(String schemaJson) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(schemaJson, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "schemaJson 不是合法 JSON");
        }
    }

    private TemplateVersionOwnerDetail toOwnerDetail(TemplateVersionEntity entity) {
        String schemaText = entity.getSchemaJson();
        if (schemaText == null || schemaText.isBlank()) {
            schemaText = "{}";
        }
        Long templateId = resolveTemplateId(entity);
        TemplatesEntity template = templateId != null ? templatesMapper.selectById(templateId) : null;
        Long currentVersionId = template != null ? template.getCurrentTemplateVersionId() : null;
        boolean isCurrent = currentVersionId != null && currentVersionId.equals(entity.getId())
                || (entity.getIsCurrent() != null && entity.getIsCurrent() == 1);
        return new TemplateVersionOwnerDetail(
                entity.getId(),
                entity.getTemplateId(),
                entity.getTaskId(),
                entity.getVersionNo(),
                null,
                entity.getStatus(),
                isCurrent,
                schemaText,
                entity.getReviewPromptTemplate(),
                entity.getCreatedBy(),
                userDisplayNameResolver.resolve(entity.getCreatedBy()),
                entity.getPublishedAt(),
                entity.getCreatedAt());
    }

    private Long resolveTemplateId(TemplateVersionEntity version) {
        if (version.getTemplateId() != null) {
            return version.getTemplateId();
        }
        if (version.getTaskId() == null) {
            return null;
        }
        LambdaQueryWrapper<TemplatesEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplatesEntity::getTaskId, version.getTaskId());
        wrapper.eq(TemplatesEntity::getDeletedFlag, 0);
        wrapper.last("LIMIT 1");
        TemplatesEntity template = templatesMapper.selectOne(wrapper);
        return template != null ? template.getId() : null;
    }

    private TemplatesEntity requireTemplate(Long templateId) {
        TemplatesEntity entity = templatesMapper.selectById(templateId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
        }
        return entity;
    }

    private TemplateVersionEntity requireVersion(Long versionId) {
        TemplateVersionEntity entity = templateVersionMapper.selectById(versionId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
        }
        return entity;
    }

    private TemplateSummary toSummary(TemplatesEntity entity) {
        return new TemplateSummary(entity.getId(), entity.getTaskId(), entity.getTemplateCode(),
                entity.getTemplateName(), entity.getSceneCode(), entity.getDescriptionText(),
                entity.getCurrentTemplateVersionId(), entity.getLatestVersionNo(),
                entity.getStatus(), entity.getCreatedAt());
    }

    private Map<Long, TemplateMarketEntity> loadTemplateMarketByVersionIds(List<TemplateVersionEntity> versions) {
        List<Long> versionIds = versions.stream()
                .map(TemplateVersionEntity::getId)
                .filter(java.util.Objects::nonNull)
                .toList();
        if (versionIds.isEmpty()) {
            return Map.of();
        }
        LambdaQueryWrapper<TemplateMarketEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateMarketEntity::getDeletedFlag, 0);
        wrapper.in(TemplateMarketEntity::getTemplateVersionId, versionIds);
        wrapper.orderByDesc(TemplateMarketEntity::getUpdatedAt).orderByDesc(TemplateMarketEntity::getId);
        Map<Long, TemplateMarketEntity> result = new HashMap<>();
        for (TemplateMarketEntity entity : templateMarketMapper.selectList(wrapper)) {
            if (entity.getTemplateVersionId() != null) {
                result.putIfAbsent(entity.getTemplateVersionId(), entity);
            }
        }
        return result;
    }

    private TemplateVersionSummary toVersionSummary(TemplateVersionEntity entity, Long currentVersionId) {
        return toVersionSummary(entity, currentVersionId, null);
    }

    private TemplateVersionSummary toVersionSummary(
            TemplateVersionEntity entity,
            Long currentVersionId,
            TemplateMarketEntity marketEntity) {
        int isCurrent = currentVersionId != null && currentVersionId.equals(entity.getId()) ? 1
                : (entity.getIsCurrent() != null ? entity.getIsCurrent() : 0);
        return new TemplateVersionSummary(
                entity.getId(),
                entity.getTaskId(),
                entity.getVersionNo(),
                entity.getTemplateName(),
                entity.getStatus(),
                entity.getPublishedAt(),
                entity.getCreatedAt(),
                entity.getTemplateId(),
                null,
                isCurrent,
                entity.getCreatedBy(),
                userDisplayNameResolver.resolve(entity.getCreatedBy()),
                marketEntity != null ? marketEntity.getAuditStatus() : null,
                marketEntity != null ? marketEntity.getPublishedAt() : null);
    }
}
