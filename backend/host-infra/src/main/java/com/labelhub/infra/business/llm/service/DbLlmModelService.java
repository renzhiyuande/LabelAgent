package com.labelhub.infra.business.llm.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.LlmModelSummary;
import com.labelhub.core.business.LlmModelService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.SystemDtos.LlmModelCommand;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.LlmModelQuerySpec;
import com.labelhub.infra.persistence.entity.LlmModelEntity;
import com.labelhub.infra.persistence.entity.LlmProviderEntity;
import com.labelhub.infra.persistence.mapper.LlmModelMapper;
import com.labelhub.infra.persistence.mapper.LlmProviderMapper;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbLlmModelService implements LlmModelService {
    private static final ResourceQuerySpec<LlmModelEntity> QUERY_SPEC = LlmModelQuerySpec.build();

    private final LlmModelMapper llmModelMapper;
    private final LlmProviderMapper llmProviderMapper;
    private final MybatisQueryApplier queryApplier;

    public DbLlmModelService(LlmModelMapper llmModelMapper, LlmProviderMapper llmProviderMapper,
            MybatisQueryApplier queryApplier) {
        this.llmModelMapper = llmModelMapper;
        this.llmProviderMapper = llmProviderMapper;
        this.queryApplier = queryApplier;
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public PageResponse<LlmModelSummary> listModels(Long providerId, ParsedListQuery query) {
        requireActiveProvider(providerId);
        LambdaQueryWrapper<LlmModelEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LlmModelEntity::getDeletedFlag, 0).eq(LlmModelEntity::getProviderId, providerId);
        if (query.keyword() != null && !query.keyword().isBlank()) {
            wrapper.and(w -> w.like(LlmModelEntity::getModelName, query.keyword())
                    .or().like(LlmModelEntity::getModelCode, query.keyword()));
        }
        queryApplier.apply(wrapper, query, QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByAsc(LlmModelEntity::getModelName);
        }
        IPage<LlmModelEntity> pageResult = llmModelMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(this::toSummary).toList());
    }

    @Override
    @RequireAnyPermission({ "system:admin" })
    public LlmModelSummary getModelDetail(Long id) {
        return toSummary(requireModel(id));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "LLM_MODEL", actionCode = "llm_model.create", entityId = "#result.id()", after = com.labelhub.core.audit.AuditSnapshotSource.RESULT)
    public LlmModelSummary createModel(LlmModelCommand command) {
        requireActiveProvider(command.providerId());
        LlmModelEntity entity = new LlmModelEntity();
        entity.setProviderId(command.providerId());
        applyCommand(entity, command);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        llmModelMapper.insert(entity);
        return toSummary(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "LLM_MODEL", actionCode = "llm_model.update", entityId = "#id")
    public LlmModelSummary updateModel(Long id, LlmModelCommand command) {
        LlmModelEntity entity = requireModel(id);
        if (!entity.getProviderId().equals(command.providerId())) {
            requireActiveProvider(command.providerId());
            entity.setProviderId(command.providerId());
        }
        applyCommand(entity, command);
        entity.setUpdatedAt(Instant.now());
        llmModelMapper.updateById(entity);
        return toSummary(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "LLM_MODEL", actionCode = "llm_model.delete", entityId = "#id")
    public void deleteModel(Long id) {
        LlmModelEntity entity = requireModel(id);
        entity.setDeletedFlag(1);
        entity.setUpdatedAt(Instant.now());
        llmModelMapper.updateById(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin" })
    @Audit(entityType = "LLM_MODEL", actionCode = "llm_model.toggle_status", entityId = "#id")
    public void toggleStatus(Long id, String status) {
        LlmModelEntity entity = requireModel(id);
        entity.setStatus(status);
        entity.setUpdatedAt(Instant.now());
        llmModelMapper.updateById(entity);
    }

    private void applyCommand(LlmModelEntity entity, LlmModelCommand command) {
        entity.setModelCode(command.modelCode());
        entity.setModelName(command.modelName());
        entity.setModelType(command.modelType());
        entity.setContextWindow(command.contextWindow());
        entity.setMaxOutputTokens(command.maxOutputTokens());
        entity.setCostPer1kInputTokens(command.costPer1kInputTokens());
        entity.setCostPer1kOutputTokens(command.costPer1kOutputTokens());
        entity.setStatus(command.status());
    }

    private LlmProviderEntity requireActiveProvider(Long providerId) {
        LlmProviderEntity provider = llmProviderMapper.selectById(providerId);
        if (provider == null || provider.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Provider not found");
        }
        return provider;
    }

    private LlmModelEntity requireModel(Long id) {
        LlmModelEntity entity = llmModelMapper.selectById(id);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Model not found");
        }
        return entity;
    }

    private LlmModelSummary toSummary(LlmModelEntity entity) {
        return new LlmModelSummary(
                entity.getId(),
                entity.getProviderId(),
                entity.getModelCode(),
                entity.getModelName(),
                entity.getModelType(),
                entity.getContextWindow(),
                entity.getMaxOutputTokens(),
                entity.getCostPer1kInputTokens(),
                entity.getCostPer1kOutputTokens(),
                entity.getStatus(),
                entity.getCreatedAt());
    }
}
