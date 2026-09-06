package com.labelhub.infra.business.review.handler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.notification.NotificationDtos.NotificationCommand;
import com.labelhub.core.notification.NotificationDtos.NotificationType;
import com.labelhub.core.notification.NotificationService;
import com.labelhub.core.review.AiReviewContext;
import com.labelhub.core.review.AiReviewPromptSuggestion;
import com.labelhub.core.review.PromptOptimizeResult;
import com.labelhub.infra.async.AsyncTaskHandler;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.business.review.engine.PyAgentPromptOptimizeClient;
import com.labelhub.infra.business.review.optimize.OfflineReplayEvaluator;
import com.labelhub.infra.business.review.optimize.PromptOptimizationTrigger;
import com.labelhub.infra.persistence.entity.AiReviewMisalignmentCaseEntity;
import com.labelhub.infra.persistence.entity.AiReviewPromptHealthMetricEntity;
import com.labelhub.infra.persistence.entity.AiReviewPromptSuggestionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplateReviewDimensionEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewMisalignmentCaseMapper;
import com.labelhub.infra.persistence.mapper.AiReviewPromptHealthMetricMapper;
import com.labelhub.infra.persistence.mapper.AiReviewPromptSuggestionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateReviewDimensionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class PromptOptimizationTaskHandler implements AsyncTaskHandler {
    private static final Logger log = LoggerFactory.getLogger(PromptOptimizationTaskHandler.class);

    private static final String OUTCOME_SUGGESTION_CREATED = "SUGGESTION_CREATED";
    private static final String OUTCOME_SKIPPED_EMPTY_PROMPT = "SKIPPED_EMPTY_PROMPT";
    private static final String OUTCOME_SKIPPED_NO_TRAIN_CASES = "SKIPPED_NO_TRAIN_CASES";
    private static final String OUTCOME_SKIPPED_AB_TEST_FAILED = "SKIPPED_AB_TEST_FAILED";

    private final TemplateVersionMapper templateVersionMapper;
    private final TemplateReviewDimensionMapper templateReviewDimensionMapper;
    private final AiReviewMisalignmentCaseMapper misalignmentCaseMapper;
    private final AiReviewPromptHealthMetricMapper healthMetricMapper;
    private final AiReviewPromptSuggestionMapper suggestionMapper;
    private final TaskMapper taskMapper;
    private final OfflineReplayEvaluator replayEvaluator;
    private final AsyncTaskService asyncTaskService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final PyAgentPromptOptimizeClient promptOptimizeClient;

    public PromptOptimizationTaskHandler(
            TemplateVersionMapper templateVersionMapper,
            TemplateReviewDimensionMapper templateReviewDimensionMapper,
            AiReviewMisalignmentCaseMapper misalignmentCaseMapper,
            AiReviewPromptHealthMetricMapper healthMetricMapper,
            AiReviewPromptSuggestionMapper suggestionMapper,
            TaskMapper taskMapper,
            OfflineReplayEvaluator replayEvaluator,
            AsyncTaskService asyncTaskService,
            NotificationService notificationService,
            ObjectMapper objectMapper,
            @Autowired(required = false) PyAgentPromptOptimizeClient promptOptimizeClient) {
        this.templateVersionMapper = templateVersionMapper;
        this.templateReviewDimensionMapper = templateReviewDimensionMapper;
        this.misalignmentCaseMapper = misalignmentCaseMapper;
        this.healthMetricMapper = healthMetricMapper;
        this.suggestionMapper = suggestionMapper;
        this.taskMapper = taskMapper;
        this.replayEvaluator = replayEvaluator;
        this.asyncTaskService = asyncTaskService;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
        this.promptOptimizeClient = promptOptimizeClient;
    }

    @Override
    public String taskType() {
        return PromptOptimizationTrigger.TASK_TYPE;
    }

    @Override
    public void handle(AsyncTaskEntity task) {
        Long templateVersionId = resolveTemplateVersionId(task);
        log.info(
                "Prompt optimization started asyncTaskId={} bizKey={} templateVersionId={}",
                task.getId(),
                task.getBizKey(),
                templateVersionId);

        if (promptOptimizeClient == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Prompt optimize client is not configured (pyagent required)");
        }

        TemplateVersionEntity version = requireVersion(templateVersionId);
        Long ownerId = resolveOwnerId(version);
        Long templateId = version.getTemplateId();
        String baselinePrompt = version.getReviewPromptTemplate();
        if (baselinePrompt == null || baselinePrompt.isBlank()) {
            completeWithoutSuggestion(
                    task,
                    OUTCOME_SKIPPED_EMPTY_PROMPT,
                    templateVersionId,
                    templateId,
                    ownerId,
                    "baseline prompt is empty",
                    "当前模板版本未配置预审 Prompt，未生成优化建议。请先在模板审核配置中补充 Prompt 后重试。");
            return;
        }

        List<AiReviewContext.AiReviewDimensionSpec> dimensionSpecs = loadDimensionSpecs(templateVersionId);
        List<AiReviewMisalignmentCaseEntity> trainCases = loadCases(templateVersionId, "TRAIN");
        if (trainCases.isEmpty()) {
            completeWithoutSuggestion(
                    task,
                    OUTCOME_SKIPPED_NO_TRAIN_CASES,
                    templateVersionId,
                    templateId,
                    ownerId,
                    "trainCases=0",
                    "暂无可用误判训练样本，未生成优化建议。请先积累 AI 预审与人工复核数据，或执行「立即聚合」后再试。");
            return;
        }

        List<AiReviewMisalignmentCaseEntity> testCases = loadCases(templateVersionId, "TEST");
        log.info(
                "Prompt optimization invoking pyagent asyncTaskId={} templateVersionId={} templateId={} trainCases={} testCases={} dimensions={}",
                task.getId(),
                templateVersionId,
                templateId,
                trainCases.size(),
                testCases.size(),
                dimensionSpecs.size());

        if (!StringUtils.hasText(version.getProviderPlatformKey()) || !StringUtils.hasText(version.getModelId())) {
            throw new BusinessException(
                    ErrorCode.INVALID_OPERATION,
                    "模板版本未配置 AI 预审 Provider/Model，请在审核配置中设置后再触发 Prompt 优化");
        }

        PromptOptimizeResult optimizeResult = promptOptimizeClient.optimize(promptOptimizeClient.buildRequest(
                baselinePrompt,
                version.getProviderPlatformKey(),
                version.getModelId(),
                toOptimizeDimensions(dimensionSpecs),
                toOptimizeCases(trainCases),
                List.of("raise_ai_human_agreement", "reduce_ai_reject_appeal_pass_rate")));

        log.info(
                "Prompt optimization starting offline replay asyncTaskId={} replayCap train={} test={}",
                task.getId(),
                OfflineReplayEvaluator.MAX_TRAIN_CASES,
                OfflineReplayEvaluator.MAX_TEST_CASES);
        Map<String, Object> abTestReport = replayEvaluator.evaluate(
                version,
                dimensionSpecs,
                baselinePrompt,
                optimizeResult.candidatePromptTemplate(),
                trainCases,
                testCases,
                () -> asyncTaskService.touchLock(task.getId()));

        if (!Boolean.TRUE.equals(abTestReport.get("passed"))) {
            completeWithoutSuggestion(
                    task,
                    OUTCOME_SKIPPED_AB_TEST_FAILED,
                    templateVersionId,
                    templateId,
                    ownerId,
                    summarizeAbTestReport(abTestReport),
                    "候选 Prompt 未通过离线 A/B 验证，未生成优化建议。可继续积累样本后再次触发。");
            return;
        }

        AiReviewPromptSuggestionEntity suggestion = new AiReviewPromptSuggestionEntity();
        suggestion.setTemplateVersionId(templateVersionId);
        suggestion.setTaskId(version.getTaskId());
        suggestion.setOwnerId(ownerId);
        suggestion.setBaselinePromptTemplate(baselinePrompt);
        suggestion.setCandidatePromptTemplate(optimizeResult.candidatePromptTemplate());
        suggestion.setChangeSummary(optimizeResult.changeSummary());
        suggestion.setBaselineMetricsJson(loadLatestMetricsJson(templateVersionId));
        try {
            suggestion.setAbTestReportJson(objectMapper.writeValueAsString(abTestReport));
        } catch (Exception ex) {
            suggestion.setAbTestReportJson("{}");
        }
        suggestion.setStatus(AiReviewPromptSuggestion.STATUS_PENDING);
        suggestion.setCreatedAt(Instant.now());
        suggestion.setUpdatedAt(Instant.now());
        suggestionMapper.insert(suggestion);

        String abTestSummary = summarizeAbTestReport(abTestReport);
        recordOptimizationOutcome(
                task,
                OUTCOME_SUGGESTION_CREATED,
                abTestSummary,
                optimizeResult.changeSummary());
        notifyOptimizationRecipients(
                task,
                ownerId,
                templateId,
                suggestion.getId(),
                NotificationType.ALERT,
                "AI 预审提示词优化建议",
                optimizeResult.changeSummary(),
                suggestion.getId());
        log.info(
                "Prompt optimization completed asyncTaskId={} outcome={} templateVersionId={} templateId={} ownerId={} suggestionId={} changeSummary={} abTest={}",
                task.getId(),
                OUTCOME_SUGGESTION_CREATED,
                templateVersionId,
                templateId,
                ownerId,
                suggestion.getId(),
                truncateForLog(optimizeResult.changeSummary(), 120),
                abTestSummary);
    }

    private void completeWithoutSuggestion(
            AsyncTaskEntity task,
            String outcome,
            Long templateVersionId,
            Long templateId,
            Long ownerId,
            String detail,
            String notificationBody) {
        recordOptimizationOutcome(task, outcome, detail, notificationBody);
        log.info(
                "Prompt optimization completed asyncTaskId={} outcome={} templateVersionId={} templateId={} ownerId={} detail={}",
                task.getId(),
                outcome,
                templateVersionId,
                templateId,
                ownerId,
                detail);
        notifyOptimizationRecipients(
                task,
                ownerId,
                templateId,
                null,
                NotificationType.SYSTEM,
                "提示词优化任务已完成",
                notificationBody,
                null);
    }

    private void recordOptimizationOutcome(
            AsyncTaskEntity task, String outcome, String summary, String notificationBody) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("optimizationOutcome", outcome);
        fields.put("optimizationSummary", summary);
        fields.put("notificationBody", notificationBody);
        asyncTaskService.mergePayload(task.getId(), fields);
    }

    private String summarizeAbTestReport(Map<String, Object> abTestReport) {
        if (abTestReport == null || abTestReport.isEmpty()) {
            return "abTest=empty";
        }
        return "passed="
                + abTestReport.get("passed")
                + " testCaseCount="
                + abTestReport.get("testCaseCount")
                + " trainCaseCount="
                + abTestReport.get("trainCaseCount")
                + " trainOverfitGap="
                + abTestReport.get("trainOverfitGap")
                + " baselineTestAgreement="
                + readNestedMetric(abTestReport, "baseline", "test", "testAgreementRate")
                + " candidateTestAgreement="
                + readNestedMetric(abTestReport, "candidate", "test", "testAgreementRate");
    }

    @SuppressWarnings("unchecked")
    private Object readNestedMetric(Map<String, Object> report, String groupKey, String splitKey, String metricKey) {
        Object group = report.get(groupKey);
        if (!(group instanceof Map<?, ?> groupMap)) {
            return null;
        }
        Object split = groupMap.get(splitKey);
        if (!(split instanceof Map<?, ?> splitMap)) {
            return null;
        }
        return splitMap.get(metricKey);
    }

    private String truncateForLog(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, maxLength) + "...";
    }

    private void notifyOptimizationRecipients(
            AsyncTaskEntity task,
            Long templateOwnerId,
            Long templateId,
            Long suggestionId,
            NotificationType type,
            String title,
            String body,
            Long bizId) {
        Set<Long> recipientIds = new LinkedHashSet<>();
        Long triggeredByUserId = resolveTriggeredByUserId(task);
        if (triggeredByUserId != null) {
            recipientIds.add(triggeredByUserId);
        }
        if (templateOwnerId != null) {
            recipientIds.add(templateOwnerId);
        }
        if (recipientIds.isEmpty()) {
            return;
        }
        String linkUrl = buildHealthPageLink(templateId, suggestionId);
        List<NotificationCommand> commands = recipientIds.stream()
                .map(recipientId -> new NotificationCommand(
                        recipientId,
                        type,
                        title,
                        body,
                        linkUrl,
                        AiReviewPromptSuggestion.BIZ_TYPE,
                        bizId,
                        null))
                .toList();
        notificationService.sendAll(commands);
        log.info(
                "Prompt optimization notifications sent asyncTaskId={} recipients={} title={}",
                task.getId(),
                recipientIds,
                title);
    }

    private Long resolveTriggeredByUserId(AsyncTaskEntity task) {
        String payloadJson = task.getPayloadJson();
        if (payloadJson == null || payloadJson.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> payload = objectMapper.readValue(payloadJson, new TypeReference<>() {});
            Object value = payload.get("triggeredByUserId");
            if (value instanceof Number number) {
                return number.longValue();
            }
        } catch (Exception ex) {
            log.warn("Invalid triggeredByUserId in prompt optimization payload for task {}", task.getId());
        }
        return null;
    }

    private String buildHealthPageLink(Long templateId, Long suggestionId) {
        if (templateId == null) {
            return "/owner/ai-review-health";
        }
        if (suggestionId == null) {
            return "/owner/ai-review-health/" + templateId;
        }
        return "/owner/ai-review-health/" + templateId + "?suggestionId=" + suggestionId;
    }

    private Long resolveTemplateVersionId(AsyncTaskEntity task) {
        String payloadJson = task.getPayloadJson();
        if (payloadJson != null && !payloadJson.isBlank()) {
            try {
                Map<String, Object> payload = objectMapper.readValue(payloadJson, new TypeReference<>() {});
                Object value = payload.get("templateVersionId");
                if (value instanceof Number number) {
                    return number.longValue();
                }
            } catch (Exception ex) {
                log.warn("Invalid prompt optimization payload for task {}", task.getId());
            }
        }
        if (task.getBizId() != null) {
            return task.getBizId();
        }
        throw new BusinessException(ErrorCode.VALIDATION_ERROR, "templateVersionId is required for prompt optimization");
    }

    private TemplateVersionEntity requireVersion(Long templateVersionId) {
        TemplateVersionEntity version = templateVersionMapper.selectById(templateVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
        }
        return version;
    }

    private List<AiReviewMisalignmentCaseEntity> loadCases(Long templateVersionId, String splitTag) {
        LambdaQueryWrapper<AiReviewMisalignmentCaseEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewMisalignmentCaseEntity::getDeletedFlag, 0)
                .eq(AiReviewMisalignmentCaseEntity::getTemplateVersionId, templateVersionId)
                .eq(AiReviewMisalignmentCaseEntity::getSplitTag, splitTag)
                .orderByDesc(AiReviewMisalignmentCaseEntity::getCreatedAt);
        return misalignmentCaseMapper.selectList(wrapper);
    }

    private List<AiReviewContext.AiReviewDimensionSpec> loadDimensionSpecs(Long templateVersionId) {
        LambdaQueryWrapper<TemplateReviewDimensionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateReviewDimensionEntity::getTemplateVersionId, templateVersionId)
                .orderByAsc(TemplateReviewDimensionEntity::getSortNo);
        return templateReviewDimensionMapper.selectList(wrapper).stream()
                .map(d -> new AiReviewContext.AiReviewDimensionSpec(
                        d.getDimensionKey(),
                        d.getDimensionName(),
                        d.getWeight(),
                        d.getScoreMin(),
                        d.getScoreMax(),
                        d.getPassThreshold(),
                        d.getRejectThreshold(),
                        d.getPromptInstruction()))
                .toList();
    }

    private List<Map<String, Object>> toOptimizeDimensions(List<AiReviewContext.AiReviewDimensionSpec> specs) {
        List<Map<String, Object>> dimensions = new ArrayList<>();
        for (AiReviewContext.AiReviewDimensionSpec spec : specs) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("key", spec.dimensionKey());
            item.put("name", spec.dimensionName());
            item.put("promptInstruction", spec.promptInstruction());
            dimensions.add(item);
        }
        return dimensions;
    }

    private List<Map<String, Object>> toOptimizeCases(List<AiReviewMisalignmentCaseEntity> cases) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (AiReviewMisalignmentCaseEntity misCase : cases) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("misalignmentType", misCase.getMisalignmentType());
            item.put("aiVerdict", misCase.getAiVerdict());
            item.put("humanLabel", misCase.getHumanLabel());
            item.put("itemPayload", readMap(misCase.getItemPayloadJson()));
            item.put("submitData", readMap(misCase.getSubmitDataJson()));
            item.put("aiSummary", misCase.getAiSummaryText());
            item.put("humanComment", misCase.getHumanCommentText());
            result.add(item);
        }
        return result;
    }

    private Map<String, Object> readMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private String loadLatestMetricsJson(Long templateVersionId) {
        LambdaQueryWrapper<AiReviewPromptHealthMetricEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewPromptHealthMetricEntity::getDeletedFlag, 0)
                .eq(AiReviewPromptHealthMetricEntity::getTemplateVersionId, templateVersionId)
                .orderByDesc(AiReviewPromptHealthMetricEntity::getMetricDate)
                .last("LIMIT 1");
        AiReviewPromptHealthMetricEntity metric = healthMetricMapper.selectOne(wrapper);
        return metric == null ? null : metric.getMetricsJson();
    }

    private Long resolveOwnerId(TemplateVersionEntity version) {
        if (version.getTaskId() == null) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        TaskEntity task = taskMapper.selectById(version.getTaskId());
        if (task == null || task.getDeletedFlag() == 1 || task.getOwnerId() == null) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        return task.getOwnerId();
    }
}
