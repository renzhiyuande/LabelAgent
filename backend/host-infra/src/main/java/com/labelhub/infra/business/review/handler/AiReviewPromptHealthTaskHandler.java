package com.labelhub.infra.business.review.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.review.AiReviewPromptHealthQueryService;
import com.labelhub.infra.async.AsyncTaskHandler;
import com.labelhub.infra.business.review.health.AiReviewPromptHealthAggregator;
import com.labelhub.infra.business.review.optimize.PromptOptimizationTrigger;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewPromptHealthTaskHandler implements AsyncTaskHandler {
    private static final Logger log = LoggerFactory.getLogger(AiReviewPromptHealthTaskHandler.class);
    public static final String TASK_TYPE = "AI_REVIEW_PROMPT_HEALTH";

    private final AiReviewPromptHealthQueryService promptHealthQueryService;
    private final AiReviewPromptHealthAggregator aggregator;
    private final PromptOptimizationTrigger optimizationTrigger;
    private final ObjectMapper objectMapper;

    public AiReviewPromptHealthTaskHandler(
            AiReviewPromptHealthQueryService promptHealthQueryService,
            AiReviewPromptHealthAggregator aggregator,
            PromptOptimizationTrigger optimizationTrigger,
            ObjectMapper objectMapper) {
        this.promptHealthQueryService = promptHealthQueryService;
        this.aggregator = aggregator;
        this.optimizationTrigger = optimizationTrigger;
        this.objectMapper = objectMapper;
    }

    @Override
    public String taskType() {
        return TASK_TYPE;
    }

    @Override
    public void handle(AsyncTaskEntity task) {
        LocalDate metricDate = resolveMetricDate(task);
        log.info("AI review prompt health task {} started for metricDate={}", task.getId(), metricDate);
        promptHealthQueryService.aggregateForDate(metricDate);

        List<Long> versionIds = aggregator.listActiveTemplateVersionIds();
        int totalExtracted = 0;
        for (Long versionId : versionIds) {
            totalExtracted += promptHealthQueryService.extractMisalignmentCases(versionId);
            optimizationTrigger.maybeEnqueueForVersion(versionId, metricDate);
        }
        log.info(
                "AI review prompt health task {} completed for metricDate={}, extractedCases={}",
                task.getId(),
                metricDate,
                totalExtracted);
    }

    private LocalDate resolveMetricDate(AsyncTaskEntity task) {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        String payloadJson = task.getPayloadJson();
        if (payloadJson == null || payloadJson.isBlank()) {
            return yesterday;
        }
        try {
            Map<String, Object> payload = objectMapper.readValue(payloadJson, new TypeReference<>() {});
            String metricDateStr = (String) payload.get("metricDate");
            if (metricDateStr == null || metricDateStr.isBlank() || "yesterday".equalsIgnoreCase(metricDateStr)) {
                return yesterday;
            }
            return LocalDate.parse(metricDateStr);
        } catch (Exception ex) {
            log.warn("Invalid prompt health payload for task {}, fallback to yesterday", task.getId());
            return yesterday;
        }
    }
}
