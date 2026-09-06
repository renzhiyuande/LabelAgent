package com.labelhub.infra.business.review.optimize;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.business.review.health.AiReviewPromptHealthAggregator;
import com.labelhub.infra.persistence.entity.AiReviewPromptHealthMetricEntity;
import com.labelhub.infra.persistence.entity.AiReviewPromptSuggestionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewPromptHealthMetricMapper;
import com.labelhub.infra.persistence.mapper.AiReviewPromptSuggestionMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class PromptOptimizationTrigger {
    private static final Logger log = LoggerFactory.getLogger(PromptOptimizationTrigger.class);
    public static final String TASK_TYPE = "PROMPT_OPTIMIZATION";

    private final AiReviewPromptHealthMetricMapper healthMetricMapper;
    private final AiReviewPromptSuggestionMapper suggestionMapper;
    private final AsyncTaskService asyncTaskService;

    public PromptOptimizationTrigger(
            AiReviewPromptHealthMetricMapper healthMetricMapper,
            AiReviewPromptSuggestionMapper suggestionMapper,
            AsyncTaskService asyncTaskService) {
        this.healthMetricMapper = healthMetricMapper;
        this.suggestionMapper = suggestionMapper;
        this.asyncTaskService = asyncTaskService;
    }

    public void maybeEnqueueForVersion(Long templateVersionId, LocalDate metricDate) {
        if (!needsOptimization(templateVersionId, metricDate)) {
            return;
        }
        if (hasPendingSuggestion(templateVersionId)) {
            log.debug("Skip prompt optimization for version {}: pending suggestion exists", templateVersionId);
            return;
        }
        if (isInCooldown(templateVersionId)) {
            log.debug("Skip prompt optimization for version {}: in cooldown", templateVersionId);
            return;
        }
        enqueue(templateVersionId);
    }

    public boolean enqueue(Long templateVersionId) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("templateVersionId", templateVersionId);
        payload.put("triggerSource", "scheduled");
        return enqueueWithBizKey(templateVersionId, "prompt-opt:" + templateVersionId, payload);
    }

    /** 大屏/Owner 手动触发：每次使用独立 bizKey，避免历史 SUCCESS 记录阻塞重复执行。 */
    public boolean enqueueManual(Long templateVersionId) {
        return enqueueManual(templateVersionId, null);
    }

    public boolean enqueueManual(Long templateVersionId, Long triggeredByUserId) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("templateVersionId", templateVersionId);
        payload.put("triggerSource", "manual");
        if (triggeredByUserId != null) {
            payload.put("triggeredByUserId", triggeredByUserId);
        }
        return enqueueWithBizKey(
                templateVersionId,
                "prompt-opt:" + templateVersionId + ":manual:" + System.currentTimeMillis(),
                payload);
    }

    private boolean enqueueWithBizKey(Long templateVersionId, String bizKey, Map<String, Object> payload) {
        boolean inserted = asyncTaskService.enqueue(
                TASK_TYPE,
                "TEMPLATE_VERSION",
                templateVersionId,
                bizKey,
                4,
                payload);
        String triggerSource = String.valueOf(payload.getOrDefault("triggerSource", "unknown"));
        if (inserted) {
            log.info(
                    "Enqueued prompt optimization triggerSource={} taskType={} bizType=TEMPLATE_VERSION bizKey={} templateVersionId={}",
                    triggerSource,
                    TASK_TYPE,
                    bizKey,
                    templateVersionId);
        } else {
            log.info(
                    "Skipped prompt optimization enqueue triggerSource={} taskType={} bizKey={} templateVersionId={} reason=duplicate_biz_key",
                    triggerSource,
                    TASK_TYPE,
                    bizKey,
                    templateVersionId);
        }
        return inserted;
    }

    private boolean needsOptimization(Long templateVersionId, LocalDate metricDate) {
        LambdaQueryWrapper<AiReviewPromptHealthMetricEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewPromptHealthMetricEntity::getDeletedFlag, 0)
                .eq(AiReviewPromptHealthMetricEntity::getTemplateVersionId, templateVersionId)
                .eq(AiReviewPromptHealthMetricEntity::getTaskId, AiReviewPromptHealthAggregator.VERSION_LEVEL_TASK_ID)
                .eq(AiReviewPromptHealthMetricEntity::getMetricDate, metricDate)
                .orderByDesc(AiReviewPromptHealthMetricEntity::getCreatedAt)
                .last("LIMIT 1");
        AiReviewPromptHealthMetricEntity metric = healthMetricMapper.selectOne(wrapper);
        return metric != null
                && AiReviewPromptHealthAggregator.HEALTH_NEEDS_OPTIMIZATION.equals(metric.getHealthStatus());
    }

    private boolean hasPendingSuggestion(Long templateVersionId) {
        LambdaQueryWrapper<AiReviewPromptSuggestionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewPromptSuggestionEntity::getDeletedFlag, 0)
                .eq(AiReviewPromptSuggestionEntity::getTemplateVersionId, templateVersionId)
                .eq(AiReviewPromptSuggestionEntity::getStatus, com.labelhub.core.review.AiReviewPromptSuggestion.STATUS_PENDING);
        return suggestionMapper.selectCount(wrapper) > 0;
    }

    private boolean isInCooldown(Long templateVersionId) {
        LambdaQueryWrapper<AiReviewPromptSuggestionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewPromptSuggestionEntity::getDeletedFlag, 0)
                .eq(AiReviewPromptSuggestionEntity::getTemplateVersionId, templateVersionId)
                .eq(AiReviewPromptSuggestionEntity::getStatus, com.labelhub.core.review.AiReviewPromptSuggestion.STATUS_DISMISSED)
                .isNotNull(AiReviewPromptSuggestionEntity::getCooldownUntil)
                .gt(AiReviewPromptSuggestionEntity::getCooldownUntil, Instant.now())
                .orderByDesc(AiReviewPromptSuggestionEntity::getCooldownUntil)
                .last("LIMIT 1");
        return suggestionMapper.selectOne(wrapper) != null;
    }
}
