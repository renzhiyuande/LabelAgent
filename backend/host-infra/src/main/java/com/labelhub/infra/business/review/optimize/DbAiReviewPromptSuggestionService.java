package com.labelhub.infra.business.review.optimize;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.TemplateReviewDimensionSummary;
import com.labelhub.core.business.BusinessDtos.TemplateVersionSummary;
import com.labelhub.core.business.TaskService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.notification.NotificationDtos.NotificationCommand;
import com.labelhub.core.notification.NotificationDtos.NotificationType;
import com.labelhub.core.notification.NotificationService;
import com.labelhub.core.review.AiReviewPromptSuggestion;
import com.labelhub.core.review.AiReviewPromptSuggestionService;
import com.labelhub.core.review.PromptOptimizationTaskStatus;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.AiReviewPromptSuggestionEntity;
import com.labelhub.infra.persistence.entity.TemplateReviewDimensionEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import com.labelhub.infra.persistence.mapper.AiReviewPromptSuggestionMapper;
import com.labelhub.infra.persistence.mapper.TemplateReviewDimensionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbAiReviewPromptSuggestionService implements AiReviewPromptSuggestionService {
    private static final int DISMISS_COOLDOWN_DAYS = 14;

    private final AiReviewPromptSuggestionMapper suggestionMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final TemplatesMapper templatesMapper;
    private final TemplateReviewDimensionMapper templateReviewDimensionMapper;
    private final TaskService taskService;
    private final NotificationService notificationService;
    private final PromptOptimizationTrigger optimizationTrigger;
    private final AsyncTaskMapper asyncTaskMapper;
    private final CurrentUserProvider currentUserProvider;
    private final ObjectMapper objectMapper;

    public DbAiReviewPromptSuggestionService(
            AiReviewPromptSuggestionMapper suggestionMapper,
            TemplateVersionMapper templateVersionMapper,
            TemplatesMapper templatesMapper,
            TemplateReviewDimensionMapper templateReviewDimensionMapper,
            TaskService taskService,
            NotificationService notificationService,
            PromptOptimizationTrigger optimizationTrigger,
            AsyncTaskMapper asyncTaskMapper,
            CurrentUserProvider currentUserProvider,
            ObjectMapper objectMapper) {
        this.suggestionMapper = suggestionMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.templatesMapper = templatesMapper;
        this.templateReviewDimensionMapper = templateReviewDimensionMapper;
        this.taskService = taskService;
        this.notificationService = notificationService;
        this.optimizationTrigger = optimizationTrigger;
        this.asyncTaskMapper = asyncTaskMapper;
        this.currentUserProvider = currentUserProvider;
        this.objectMapper = objectMapper;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public List<AiReviewPromptSuggestion> list(Long templateId) {
        Long ownerId = currentUserId();
        LambdaQueryWrapper<AiReviewPromptSuggestionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewPromptSuggestionEntity::getDeletedFlag, 0)
                .eq(AiReviewPromptSuggestionEntity::getOwnerId, ownerId);
        if (templateId != null) {
            Long templateVersionId = resolveCurrentTemplateVersionIdOrNull(templateId);
            if (templateVersionId == null) {
                return List.of();
            }
            wrapper.eq(AiReviewPromptSuggestionEntity::getTemplateVersionId, templateVersionId);
        }
        wrapper.orderByDesc(AiReviewPromptSuggestionEntity::getCreatedAt);
        return suggestionMapper.selectList(wrapper).stream().map(this::toSummaryDto).toList();
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public AiReviewPromptSuggestion getDetail(Long suggestionId) {
        AiReviewPromptSuggestionEntity entity = requireOwnedSuggestion(suggestionId);
        return toDetailDto(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    @Audit(
            entityType = "AI_REVIEW_PROMPT_SUGGESTION",
            actionCode = "ai_review_prompt_suggestion.accept",
            entityId = "#suggestionId",
            after = AuditSnapshotSource.RESULT)
    public AiReviewPromptSuggestion accept(Long suggestionId) {
        AiReviewPromptSuggestionEntity entity = requireOwnedSuggestion(suggestionId);
        if (!AiReviewPromptSuggestion.STATUS_PENDING.equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Suggestion is not pending");
        }

        TemplateVersionEntity sourceVersion = requireVersion(entity.getTemplateVersionId());
        TemplateVersionSummary draft = taskService.createDraftFromBase(sourceVersion.getTaskId(), sourceVersion.getId());
        List<TemplateReviewDimensionSummary> dimensions = loadDimensionSummaries(sourceVersion.getId());
        taskService.saveDraft(
                draft.id(),
                readSchemaMap(sourceVersion.getSchemaJson()),
                entity.getCandidatePromptTemplate(),
                dimensions);

        Long userId = currentUserId();
        Instant now = Instant.now();
        entity.setStatus(AiReviewPromptSuggestion.STATUS_ACCEPTED);
        entity.setDecidedBy(userId);
        entity.setDecidedAt(now);
        entity.setAcceptedTemplateVersionId(draft.id());
        entity.setUpdatedAt(now);
        suggestionMapper.updateById(entity);
        return toDetailDto(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    @Audit(
            entityType = "AI_REVIEW_PROMPT_SUGGESTION",
            actionCode = "ai_review_prompt_suggestion.dismiss",
            entityId = "#suggestionId",
            after = AuditSnapshotSource.RESULT)
    public AiReviewPromptSuggestion dismiss(Long suggestionId, String dismissReason) {
        AiReviewPromptSuggestionEntity entity = requireOwnedSuggestion(suggestionId);
        if (!AiReviewPromptSuggestion.STATUS_PENDING.equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Suggestion is not pending");
        }

        Long userId = currentUserId();
        Instant now = Instant.now();
        entity.setStatus(AiReviewPromptSuggestion.STATUS_DISMISSED);
        entity.setDecidedBy(userId);
        entity.setDecidedAt(now);
        entity.setDismissReason(StringUtils.hasText(dismissReason) ? dismissReason.trim() : null);
        entity.setCooldownUntil(now.plus(DISMISS_COOLDOWN_DAYS, ChronoUnit.DAYS));
        entity.setUpdatedAt(now);
        suggestionMapper.updateById(entity);

        notificationService.send(new NotificationCommand(
                entity.getOwnerId(),
                NotificationType.ALERT,
                "已忽略 AI 预审提示词建议",
                entity.getDismissReason(),
                null,
                AiReviewPromptSuggestion.BIZ_TYPE,
                entity.getId(),
                userId));
        return toDetailDto(entity);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public void triggerOptimization(Long templateVersionId) {
        requireVersion(templateVersionId);
        optimizationTrigger.enqueueManual(templateVersionId, currentUserId());
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public void triggerOptimizationForTemplate(Long templateId) {
        Long templateVersionId = resolveCurrentTemplateVersionId(templateId);
        if (templateVersionId == null) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND, "Template has no current version");
        }
        triggerOptimization(templateVersionId);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public PromptOptimizationTaskStatus getLatestManualOptimizationTask(Long templateId) {
        Long templateVersionId = resolveCurrentTemplateVersionIdOrNull(templateId);
        if (templateVersionId == null) {
            return PromptOptimizationTaskStatus.empty();
        }
        String manualBizKeyPrefix = "prompt-opt:" + templateVersionId + ":manual:";
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AsyncTaskEntity::getDeletedFlag, 0)
                .eq(AsyncTaskEntity::getTaskType, PromptOptimizationTrigger.TASK_TYPE)
                .eq(AsyncTaskEntity::getBizType, "TEMPLATE_VERSION")
                .eq(AsyncTaskEntity::getBizId, templateVersionId)
                .likeRight(AsyncTaskEntity::getBizKey, manualBizKeyPrefix)
                .orderByDesc(AsyncTaskEntity::getId)
                .last("LIMIT 1");
        AsyncTaskEntity task = asyncTaskMapper.selectOne(wrapper);
        if (task == null) {
            return PromptOptimizationTaskStatus.empty();
        }
        Map<String, Object> payload = readPayloadMap(task.getPayloadJson());
        return new PromptOptimizationTaskStatus(
                task.getId(),
                task.getStatus(),
                task.getLastErrorMessage(),
                task.getFinishedAt(),
                readPayloadText(payload, "optimizationOutcome"),
                readPayloadText(payload, "optimizationSummary"),
                readPayloadText(payload, "notificationBody"));
    }

    private Map<String, Object> readPayloadMap(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private static String readPayloadText(Map<String, Object> payload, String key) {
        if (payload == null || key == null) {
            return null;
        }
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private Long resolveCurrentTemplateVersionId(Long templateId) {
        Long templateVersionId = resolveCurrentTemplateVersionIdOrNull(templateId);
        if (templateVersionId == null) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
        }
        return templateVersionId;
    }

    private Long resolveCurrentTemplateVersionIdOrNull(Long templateId) {
        TemplatesEntity template = templatesMapper.selectById(templateId);
        if (template == null || template.getDeletedFlag() == 1) {
            return null;
        }
        return template.getCurrentTemplateVersionId();
    }

    private AiReviewPromptSuggestionEntity requireOwnedSuggestion(Long suggestionId) {
        AiReviewPromptSuggestionEntity entity = suggestionMapper.selectById(suggestionId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        Long ownerId = currentUserId();
        if (!ownerId.equals(entity.getOwnerId())) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
        return entity;
    }

    private TemplateVersionEntity requireVersion(Long templateVersionId) {
        TemplateVersionEntity version = templateVersionMapper.selectById(templateVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
        }
        return version;
    }

    private List<TemplateReviewDimensionSummary> loadDimensionSummaries(Long templateVersionId) {
        LambdaQueryWrapper<TemplateReviewDimensionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateReviewDimensionEntity::getTemplateVersionId, templateVersionId)
                .orderByAsc(TemplateReviewDimensionEntity::getSortNo);
        return templateReviewDimensionMapper.selectList(wrapper).stream()
                .map(d -> new TemplateReviewDimensionSummary(
                        d.getId(),
                        d.getTemplateVersionId(),
                        d.getDimensionKey(),
                        d.getDimensionName(),
                        d.getDimensionDesc(),
                        d.getWeight(),
                        d.getScoreMin(),
                        d.getScoreMax(),
                        d.getPassThreshold(),
                        d.getRejectThreshold(),
                        d.getPromptInstruction(),
                        d.getManualReviewHint(),
                        d.getSeverityLevel(),
                        d.getSortNo(),
                        d.getRequiredFlag()))
                .toList();
    }

    private Map<String, Object> readSchemaMap(String schemaJson) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(schemaJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private AiReviewPromptSuggestion toSummaryDto(AiReviewPromptSuggestionEntity entity) {
        return new AiReviewPromptSuggestion(
                entity.getId(),
                entity.getTemplateVersionId(),
                entity.getTaskId(),
                entity.getOwnerId(),
                null,
                null,
                entity.getChangeSummary(),
                parseJsonMap(entity.getBaselineMetricsJson()),
                null,
                entity.getStatus(),
                entity.getDecidedBy(),
                entity.getDecidedAt(),
                entity.getDismissReason(),
                entity.getAcceptedTemplateVersionId(),
                entity.getCooldownUntil(),
                entity.getCreatedAt());
    }

    private AiReviewPromptSuggestion toDetailDto(AiReviewPromptSuggestionEntity entity) {
        return new AiReviewPromptSuggestion(
                entity.getId(),
                entity.getTemplateVersionId(),
                entity.getTaskId(),
                entity.getOwnerId(),
                entity.getBaselinePromptTemplate(),
                entity.getCandidatePromptTemplate(),
                entity.getChangeSummary(),
                parseJsonMap(entity.getBaselineMetricsJson()),
                parseJsonMap(entity.getAbTestReportJson()),
                entity.getStatus(),
                entity.getDecidedBy(),
                entity.getDecidedAt(),
                entity.getDismissReason(),
                entity.getAcceptedTemplateVersionId(),
                entity.getCooldownUntil(),
                entity.getCreatedAt());
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return null;
        }
    }

    private Long currentUserId() {
        AuthenticatedUser user = currentUserProvider.currentUser();
        return user.userId();
    }
}
