package com.labelhub.infra.business.llm.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.LlmApplyMapping;
import com.labelhub.core.business.BusinessDtos.LlmCatalogProviderOption;
import com.labelhub.core.business.BusinessDtos.LlmSuggestCommand;
import com.labelhub.core.business.BusinessDtos.LlmSuggestPreviewCommand;
import com.labelhub.core.business.BusinessDtos.LlmSuggestPreviewResult;
import com.labelhub.core.business.BusinessDtos.LlmSuggestResult;
import com.labelhub.core.business.LlmProviderService;
import com.labelhub.core.business.LlmSuggestService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.llm.agent.AgentLlmChatClient;
import com.labelhub.infra.business.llm.support.LlmRouter;
import com.labelhub.infra.business.llm.support.LlmStructuredResponseParser;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import com.labelhub.infra.business.llm.support.LlmSuggestContextLoader;
import com.labelhub.infra.business.llm.support.LlmSuggestContextLoader.LoadedContext;
import com.labelhub.infra.business.llm.support.LlmSuggestPromptSupport;
import com.labelhub.infra.business.llm.support.LlmSuggestPromptSupport.AssembledPrompt;
import com.labelhub.infra.business.llm.support.LlmSuggestSchemaSupport;
import com.labelhub.infra.business.llm.support.LlmSuggestSchemaSupport.LlmFieldConfig;
import com.labelhub.infra.business.llm.support.LlmSuggestSchemaSupport.ProviderWeight;
import com.labelhub.infra.persistence.entity.LlmAssistRecordEntity;
import com.labelhub.infra.persistence.entity.LlmModelEntity;
import com.labelhub.infra.persistence.entity.LlmProviderEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.LlmAssistRecordMapper;
import com.labelhub.infra.persistence.mapper.LlmModelMapper;
import com.labelhub.infra.persistence.mapper.LlmProviderMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.system.CurrentUserContext;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbLlmSuggestService implements LlmSuggestService {
    private static final Logger log = LoggerFactory.getLogger(DbLlmSuggestService.class);
    private final LlmProviderMapper llmProviderMapper;
    private final LlmModelMapper llmModelMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final LlmAssistRecordMapper llmAssistRecordMapper;
    private final LlmProviderService llmProviderService;
    private final DbLlmProviderService llmProviderServiceImpl;
    private final AgentLlmChatClient chatClient;
    private final CurrentUserContext currentUserContext;
    private final ObjectMapper objectMapper;
    private final LlmSuggestContextLoader contextLoader;
    private final LlmRouter router;
    private final Executor llmSuggestExecutor;
    private final Semaphore llmSuggestSemaphore;
    private final long readTimeoutMs;

    public DbLlmSuggestService(
            LlmProviderMapper llmProviderMapper,
            LlmModelMapper llmModelMapper,
            TemplateVersionMapper templateVersionMapper,
            LlmAssistRecordMapper llmAssistRecordMapper,
            LlmProviderService llmProviderService,
            DbLlmProviderService llmProviderServiceImpl,
            AgentLlmChatClient chatClient,
            CurrentUserContext currentUserContext,
            ObjectMapper objectMapper,
            LlmSuggestContextLoader contextLoader,
            LlmRouter router,
            @Qualifier("llmSuggestExecutor") Executor llmSuggestExecutor,
            @Qualifier("llmSuggestSemaphore") Semaphore llmSuggestSemaphore,
            @Value("${labelhub.llm.suggest.read-timeout-ms:15000}") long readTimeoutMs) {
        this.llmProviderMapper = llmProviderMapper;
        this.llmModelMapper = llmModelMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.llmAssistRecordMapper = llmAssistRecordMapper;
        this.llmProviderService = llmProviderService;
        this.llmProviderServiceImpl = llmProviderServiceImpl;
        this.chatClient = chatClient;
        this.currentUserContext = currentUserContext;
        this.objectMapper = objectMapper;
        this.contextLoader = contextLoader;
        this.router = router;
        this.llmSuggestExecutor = llmSuggestExecutor;
        this.llmSuggestSemaphore = llmSuggestSemaphore;
        this.readTimeoutMs = readTimeoutMs;
    }

    @Override
    @RequireAnyPermission({
            "business:labeler:workbench",
            "business:template:read",
            "business:template:manage",
            "business:task:template_save",
            "system:admin"
    })
    public LlmSuggestResult suggest(LlmSuggestCommand command) {
        if (command == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "command is required");
        }

        // 当 allowRegenerate 为 false 且已有历史记录时，返回已有结果（不重复调用 LLM）
        AssembledFieldPrompt assembledForPolicy = assembleFromCommand(command);
        boolean allowRegen = resolvesAllowRegenerate(
                assembledForPolicy.fieldConfig().allowRegenerate(),
                command.allowRegenerate());
        if (!allowRegen && command.submissionId() != null && StringUtils.hasText(command.fieldCode())) {
            LlmAssistRecordEntity existing = llmAssistRecordMapper
                    .findLatestBySubmissionAndField(command.submissionId(), command.fieldCode());
            if (existing != null) {
                Map<String, Object> parsed = null;
                if (existing.getParsedOutputJson() != null) {
                    try {
                        parsed = objectMapper.readValue(existing.getParsedOutputJson(),
                                objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
                    } catch (Exception ex) {
                        log.warn("Failed to deserialize existing LLM parsed output: {}", ex.getMessage());
                    }
                }
                log.info("Reusing existing LLM assist record id={} for submission={} field={}",
                        existing.getId(), command.submissionId(), command.fieldCode());
                // 仍需要组装 prompt 以获取 applyMappings
                return new LlmSuggestResult(
                        existing.getResponseText(),
                        parsed,
                        existing.getId(),
                        assembleFromCommand(command).applyMappings());
            }
        }

        AssembledFieldPrompt assembled = assembleFromCommand(command);

        // 1) 从 fieldConfig 取 providers 列表（兼容旧格式）
        List<ProviderWeight> candidates = assembled.fieldConfig().providers();
        if (candidates == null || candidates.isEmpty()) {
            ResolvedTarget target = resolveTarget(command, assembled.fieldConfig());
            candidates = List.of(new ProviderWeight(
                    target.provider().getProviderCode(),
                    target.modelCode(),
                    1));
        }

        // 2) LlmRouter 按权重 + 断路器选 Provider
        LlmRouter.ResolvedRoute route = router.pick(candidates);
        if (route == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                    "所有 LLM 提供商均不可用，请稍后重试");
        }

        long startedAt = System.currentTimeMillis();
        String status = "SUCCESS";
        String text = "";
        Map<String, Object> parsedOutput = Map.of();
        RuntimeException failure = null;
        boolean acquired = false;

        try {
            // 3) Semaphore 获取许可（带超时）
            acquired = llmSuggestSemaphore.tryAcquire(readTimeoutMs, TimeUnit.MILLISECONDS);
            if (!acquired) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR,
                        "LLM 服务繁忙，请稍后重试");
            }

            // 4) 隔离线程池 submit
            text = CompletableFuture.supplyAsync(() -> chatClient.chat(
                    route.baseUrl(),
                    route.apiKey(),
                    route.modelCode(),
                    assembled.systemPrompt(),
                    assembled.userPrompt(),
                    assembled.agentMode() ? assembled.outputJsonSchema() : null), llmSuggestExecutor)
                    .get(readTimeoutMs, TimeUnit.MILLISECONDS);

            if (!StringUtils.hasText(text)) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "LLM returned empty suggestion");
            }
            if (assembled.agentMode()) {
                parsedOutput = LlmStructuredResponseParser.tryParseJsonObject(text, objectMapper);
            }

            router.reportResult(route.providerCode(), true, null);
        } catch (TimeoutException ex) {
            status = "FAILED";
            text = "LLM 调用超时（" + readTimeoutMs + "ms）";
            failure = new BusinessException(ErrorCode.SYSTEM_ERROR, text);
            router.reportResult(route.providerCode(), false, failure);
        } catch (BusinessException ex) {
            status = "FAILED";
            text = ex.getMessage() != null ? ex.getMessage() : "LLM chat failed";
            failure = ex;
            router.reportResult(route.providerCode(), false, ex);
        } catch (Exception ex) {
            Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
            status = "FAILED";
            text = cause.getMessage() != null ? cause.getMessage() : "LLM chat failed";
            failure = cause instanceof RuntimeException
                    ? (RuntimeException) cause
                    : new BusinessException(ErrorCode.SYSTEM_ERROR, text);
            router.reportResult(route.providerCode(), false, failure);
        } finally {
            if (acquired) {
                llmSuggestSemaphore.release();
            }
        }

        int latencyMs = (int) Math.min(Integer.MAX_VALUE, System.currentTimeMillis() - startedAt);
        Long recordId = persistAssistRecord(
                command,
                route.providerCode(),
                route.modelCode(),
                assembled.userPrompt(),
                text,
                parsedOutput,
                status,
                latencyMs);
        if (failure != null) {
            throw failure;
        }
        return new LlmSuggestResult(
                text,
                parsedOutput.isEmpty() ? null : parsedOutput,
                recordId,
                assembled.applyMappings());
    }

    @Override
    @RequireAnyPermission({
            "business:labeler:workbench",
            "business:template:read",
            "business:template:manage",
            "business:task:template_save",
            "system:admin"
    })
    public LlmSuggestPreviewResult preview(LlmSuggestPreviewCommand command) {
        if (command == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "command is required");
        }
        LoadedContext loaded = contextLoader.loadForPreview(command);
        LlmFieldConfig fieldConfig = requireFieldConfig(loaded.templateVersion(), command.fieldCode());
        AssembledPrompt assembled = LlmSuggestPromptSupport.assemble(
                objectMapper,
                loaded.templateVersion().getSchemaJson(),
                fieldConfig,
                loaded.itemPayload(),
                loaded.formValues());
        String mode = assembled.agentMode() ? "agent" : "chat";
        Map<String, Object> outputSchema = assembled.outputJsonSchema();
        return new LlmSuggestPreviewResult(
                assembled.systemPrompt(),
                assembled.userPrompt(),
                mode,
                assembled.applyMappings(),
                assembled.contextFieldCount(),
                outputSchema == null || outputSchema.isEmpty() ? null : outputSchema);
    }

    private AssembledFieldPrompt assembleFromCommand(LlmSuggestCommand command) {
        LoadedContext loaded = contextLoader.loadForSuggest(command);
        LlmFieldConfig fieldConfig = requireFieldConfig(loaded.templateVersion(), command.fieldCode());
        AssembledPrompt assembled = LlmSuggestPromptSupport.assemble(
                objectMapper,
                loaded.templateVersion().getSchemaJson(),
                fieldConfig,
                loaded.itemPayload(),
                loaded.formValues());
        return new AssembledFieldPrompt(assembled, fieldConfig);
    }

    private LlmFieldConfig requireFieldConfig(TemplateVersionEntity version, String fieldCode) {
        return LlmSuggestSchemaSupport.findLlmFieldConfig(objectMapper, version.getSchemaJson(), fieldCode)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_OPERATION, "LLM field not found in template schema: " + fieldCode));
    }

    private record AssembledFieldPrompt(AssembledPrompt prompt, LlmFieldConfig fieldConfig) {
        String systemPrompt() {
            return prompt.systemPrompt();
        }

        String userPrompt() {
            return prompt.userPrompt();
        }

        boolean agentMode() {
            return prompt.agentMode();
        }

        List<LlmApplyMapping> applyMappings() {
            return prompt.applyMappings();
        }

        Map<String, Object> outputJsonSchema() {
            return prompt.outputJsonSchema();
        }
    }

    private Long persistAssistRecord(
            LlmSuggestCommand command,
            String providerCode,
            String modelCode,
            String userPrompt,
            String responseText,
            Map<String, Object> parsedOutput,
            String status,
            int latencyMs) {
        if (!canPersistAssistRecord(command)) {
            return null;
        }
        LlmAssistRecordEntity record = new LlmAssistRecordEntity();
        record.setSubmissionId(command.submissionId());
        record.setAssignmentId(command.assignmentId());
        record.setTaskId(command.taskId());
        record.setTemplateVersionId(command.templateVersionId());
        record.setFieldCode(trimToNull(command.fieldCode()));
        record.setPlatformKey(providerCode);
        record.setModelId(modelCode);
        record.setPromptText(userPrompt);
        record.setResponseText(responseText);
        if (parsedOutput != null && !parsedOutput.isEmpty()) {
            try {
                record.setParsedOutputJson(objectMapper.writeValueAsString(parsedOutput));
            } catch (Exception ex) {
                log.warn("Failed to serialize LLM suggest output JSON: {}", ex.getMessage());
                record.setParsedOutputJson(null);
            }
        }
        record.setStatus(status);
        record.setLatencyMs(latencyMs);
        record.setInvokedBy(currentUserContext.requireUserId());
        record.setInvokedAt(Instant.now());
        llmAssistRecordMapper.insert(record);
        return record.getId();
    }

    private static boolean canPersistAssistRecord(LlmSuggestCommand command) {
        return command.submissionId() != null
                && command.assignmentId() != null
                && command.taskId() != null
                && command.templateVersionId() != null
                && StringUtils.hasText(command.fieldCode());
    }

    private ResolvedTarget resolveTarget(LlmSuggestCommand command, LlmFieldConfig fieldConfig) {
        String providerCode = null;
        String modelKey = null;
        if (command.templateVersionId() != null) {
            TemplateVersionEntity version = templateVersionMapper.selectById(command.templateVersionId());
            if (version != null && version.getDeletedFlag() != null && version.getDeletedFlag() == 0) {
                if (fieldConfig != null) {
                    providerCode = trimToNull(fieldConfig.providerCode());
                    modelKey = trimToNull(fieldConfig.modelKey());
                }
                if (!StringUtils.hasText(providerCode)) {
                    providerCode = trimToNull(version.getProviderPlatformKey());
                }
                if (!StringUtils.hasText(modelKey)) {
                    modelKey = trimToNull(version.getModelId());
                }
            }
        }
        if (!StringUtils.hasText(providerCode) || !StringUtils.hasText(modelKey)) {
            LlmCatalogProviderOption fallback = pickDefaultCatalogOption();
            if (!StringUtils.hasText(providerCode)) {
                providerCode = fallback.providerCode();
            }
            if (!StringUtils.hasText(modelKey) && fallback.models() != null && !fallback.models().isEmpty()) {
                modelKey = fallback.models().get(0).modelCode();
            }
        }
        if (!StringUtils.hasText(providerCode) || !StringUtils.hasText(modelKey)) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION,
                    "未配置可用的 LLM 提供商与模型，请在字段或模板版本中指定");
        }
        LlmProviderEntity provider = findActiveProvider(providerCode);
        validateActiveModel(provider.getId(), modelKey);
        return new ResolvedTarget(provider, modelKey);
    }

    private LlmCatalogProviderOption pickDefaultCatalogOption() {
        for (LlmCatalogProviderOption option : llmProviderService.listCatalog("ALL")) {
            if (option.models() != null && !option.models().isEmpty()) {
                return option;
            }
        }
        throw new BusinessException(ErrorCode.INVALID_OPERATION, "平台未配置已发布的 LLM 模型");
    }

    private LlmProviderEntity findActiveProvider(String providerCode) {
        LambdaQueryWrapper<LlmProviderEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LlmProviderEntity::getDeletedFlag, 0)
                .eq(LlmProviderEntity::getStatus, "ACTIVE")
                .eq(LlmProviderEntity::getProviderCode, providerCode);
        LlmProviderEntity provider = llmProviderMapper.selectOne(wrapper);
        if (provider == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "LLM provider not found: " + providerCode);
        }
        return provider;
    }

    private void validateActiveModel(Long providerId, String modelCode) {
        LambdaQueryWrapper<LlmModelEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(LlmModelEntity::getDeletedFlag, 0)
                .eq(LlmModelEntity::getStatus, "ACTIVE")
                .eq(LlmModelEntity::getProviderId, providerId)
                .eq(LlmModelEntity::getModelCode, modelCode);
        LlmModelEntity model = llmModelMapper.selectOne(wrapper);
        if (model == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "LLM model not found: " + modelCode);
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** 模板 schema 与客户端请求均允许时才可重复调 LLM；任一侧为 false 则走复用逻辑。 */
    private static boolean resolvesAllowRegenerate(Boolean schemaAllowRegenerate, Boolean commandAllowRegenerate) {
        boolean schemaAllows = schemaAllowRegenerate == null || schemaAllowRegenerate;
        boolean clientAllows = commandAllowRegenerate == null || commandAllowRegenerate;
        return schemaAllows && clientAllows;
    }

    private record ResolvedTarget(LlmProviderEntity provider, String modelCode) {
    }
}
