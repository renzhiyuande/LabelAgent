package com.labelhub.infra.business.review.optimize;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.business.review.health.AiReviewPromptHealthAggregator;
import com.labelhub.infra.persistence.entity.AiReviewPromptHealthMetricEntity;
import com.labelhub.infra.persistence.entity.AiReviewPromptSuggestionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewPromptHealthMetricMapper;
import com.labelhub.infra.persistence.mapper.AiReviewPromptSuggestionMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("PromptOptimizationTrigger")
class PromptOptimizationTriggerTest {

    private static final Long TEMPLATE_VERSION_ID = 13001L;

    @Mock
    private AiReviewPromptHealthMetricMapper healthMetricMapper;
    @Mock
    private AiReviewPromptSuggestionMapper suggestionMapper;
    @Mock
    private AsyncTaskService asyncTaskService;

    private PromptOptimizationTrigger trigger;

    @BeforeEach
    void setUp() {
        trigger = new PromptOptimizationTrigger(healthMetricMapper, suggestionMapper, asyncTaskService);
    }

    @Test
    @DisplayName("健康度需优化且无 pending/冷却时入队 PROMPT_OPTIMIZATION")
    void maybeEnqueueForVersion_enqueuesWhenNeedsOptimization() {
        LocalDate metricDate = LocalDate.of(2026, 6, 8);
        stubNeedsOptimization(metricDate);
        when(suggestionMapper.selectCount(any())).thenReturn(0L);
        when(suggestionMapper.selectOne(any())).thenReturn(null);

        when(asyncTaskService.enqueue(any(), any(), any(), any(), anyInt(), any())).thenReturn(true);

        trigger.maybeEnqueueForVersion(TEMPLATE_VERSION_ID, metricDate);

        ArgumentCaptor<String> taskTypeCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(asyncTaskService).enqueue(
                taskTypeCaptor.capture(),
                eq("TEMPLATE_VERSION"),
                eq(TEMPLATE_VERSION_ID),
                eq("prompt-opt:" + TEMPLATE_VERSION_ID),
                eq(4),
                payloadCaptor.capture());
        assertThat(taskTypeCaptor.getValue()).isEqualTo(PromptOptimizationTrigger.TASK_TYPE);
        assertThat(payloadCaptor.getValue())
                .containsEntry("templateVersionId", TEMPLATE_VERSION_ID)
                .containsEntry("triggerSource", "scheduled");
    }

    @Test
    @DisplayName("存在 PENDING 建议时跳过入队")
    void maybeEnqueueForVersion_skipsWhenPendingSuggestionExists() {
        LocalDate metricDate = LocalDate.of(2026, 6, 8);
        stubNeedsOptimization(metricDate);
        when(suggestionMapper.selectCount(any())).thenReturn(1L);

        trigger.maybeEnqueueForVersion(TEMPLATE_VERSION_ID, metricDate);

        verify(asyncTaskService, never()).enqueue(any(), any(), any(), any(), anyInt(), any());
    }

    @Test
    @DisplayName("冷却期内跳过入队")
    void maybeEnqueueForVersion_skipsWhenInCooldown() {
        LocalDate metricDate = LocalDate.of(2026, 6, 8);
        stubNeedsOptimization(metricDate);
        when(suggestionMapper.selectCount(any())).thenReturn(0L);

        AiReviewPromptSuggestionEntity dismissed = new AiReviewPromptSuggestionEntity();
        dismissed.setCooldownUntil(Instant.now().plus(7, ChronoUnit.DAYS));
        when(suggestionMapper.selectOne(any())).thenReturn(dismissed);

        trigger.maybeEnqueueForVersion(TEMPLATE_VERSION_ID, metricDate);

        verify(asyncTaskService, never()).enqueue(any(), any(), any(), any(), anyInt(), any());
    }

    @Test
    @DisplayName("enqueue 使用稳定 bizKey 供日批去重")
    void enqueue_usesStableBizKeyForScheduledTrigger() {
        when(asyncTaskService.enqueue(any(), any(), any(), any(), anyInt(), any())).thenReturn(true);

        trigger.enqueue(TEMPLATE_VERSION_ID);

        ArgumentCaptor<String> bizKeyCaptor = ArgumentCaptor.forClass(String.class);
        verify(asyncTaskService).enqueue(
                eq(PromptOptimizationTrigger.TASK_TYPE),
                eq("TEMPLATE_VERSION"),
                eq(TEMPLATE_VERSION_ID),
                bizKeyCaptor.capture(),
                eq(4),
                any());
        assertThat(bizKeyCaptor.getValue()).isEqualTo("prompt-opt:" + TEMPLATE_VERSION_ID);
    }

    @Test
    @DisplayName("enqueueManual 每次使用独立 bizKey 以支持重复手动触发")
    void enqueueManual_usesUniqueBizKeyPerInvocation() {
        when(asyncTaskService.enqueue(any(), any(), any(), any(), anyInt(), any())).thenReturn(true);

        trigger.enqueueManual(TEMPLATE_VERSION_ID, 910100000001L);

        ArgumentCaptor<String> bizKeyCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(asyncTaskService).enqueue(
                eq(PromptOptimizationTrigger.TASK_TYPE),
                eq("TEMPLATE_VERSION"),
                eq(TEMPLATE_VERSION_ID),
                bizKeyCaptor.capture(),
                eq(4),
                payloadCaptor.capture());
        assertThat(bizKeyCaptor.getValue()).startsWith("prompt-opt:" + TEMPLATE_VERSION_ID + ":manual:");
        assertThat(payloadCaptor.getValue())
                .containsEntry("templateVersionId", TEMPLATE_VERSION_ID)
                .containsEntry("triggerSource", "manual")
                .containsEntry("triggeredByUserId", 910100000001L);
    }

    private void stubNeedsOptimization(LocalDate metricDate) {
        AiReviewPromptHealthMetricEntity metric = new AiReviewPromptHealthMetricEntity();
        metric.setHealthStatus(AiReviewPromptHealthAggregator.HEALTH_NEEDS_OPTIMIZATION);
        metric.setMetricDate(metricDate);
        when(healthMetricMapper.selectOne(any())).thenReturn(metric);
    }
}
