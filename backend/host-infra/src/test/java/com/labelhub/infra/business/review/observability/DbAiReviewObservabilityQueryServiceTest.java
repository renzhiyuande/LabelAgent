package com.labelhub.infra.business.review.observability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityOverview;
import com.labelhub.core.review.AiReviewObservabilityDtos.AiReviewObservabilityRecordDetail;
import com.labelhub.infra.persistence.entity.AiReviewLlmAttemptEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.AiReviewLlmAttemptMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.business.llm.support.LlmModelCostResolver;
import com.labelhub.infra.persistence.mapper.SubmissionStatusHistoryMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.system.CurrentUserContext;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DbAiReviewObservabilityQueryServiceTest {
    @Mock
    private AiReviewRecordMapper aiReviewRecordMapper;
    @Mock
    private AiReviewLlmAttemptMapper aiReviewLlmAttemptMapper;
    @Mock
    private AsyncTaskMapper asyncTaskMapper;
    @Mock
    private TaskMapper taskMapper;
    @Mock
    private SubmissionMapper submissionMapper;
    @Mock
    private SubmissionStatusHistoryMapper submissionStatusHistoryMapper;
    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private LlmModelCostResolver llmModelCostResolver;

    private DbAiReviewObservabilityQueryService service;

    @BeforeEach
    void setUp() {
        service = new DbAiReviewObservabilityQueryService(
                aiReviewRecordMapper,
                aiReviewLlmAttemptMapper,
                asyncTaskMapper,
                taskMapper,
                submissionMapper,
                submissionStatusHistoryMapper,
                currentUserContext,
                llmModelCostResolver);
    }

    @Test
    void adminOverviewAggregatesRecentRecords() {
        AiReviewRecordEntity record = new AiReviewRecordEntity();
        record.setId(100L);
        record.setTaskId(10L);
        record.setSubmissionId(20L);
        record.setSubmissionVersionId(21L);
        record.setPlatformKey("deepseek");
        record.setModelId("deepseek-chat");
        record.setStatus("SUCCESS");
        record.setVerdict("PASS");
        record.setAttemptCount(2);
        record.setTotalLatencyMs(1500);
        record.setTotalTokens(null);
        record.setTraceabilityStatus("LEGACY_BACKFILLED");
        record.setStartedAt(Instant.now().minusSeconds(600));
        record.setFinishedAt(Instant.now());

        when(asyncTaskMapper.selectCount(any())).thenReturn(3L, 1L);
        when(aiReviewRecordMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(record));
        when(taskMapper.selectBatchIds(any())).thenReturn(List.of(taskEntity(10L, "任务A", "TASK-A")));

        AiReviewObservabilityOverview overview = service.adminOverview(24);

        assertThat(overview.summary().reviewsLast24Hours()).isEqualTo(1);
        assertThat(overview.summary().queuePending()).isEqualTo(3);
        assertThat(overview.topSlow()).hasSize(1);
        assertThat(overview.modelDistribution()).hasSize(1);
    }

    @Test
    void ownerRecordDetailMasksSensitiveFields() {
        when(currentUserContext.requireUserId()).thenReturn(2001L);
        when(taskMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(taskEntity(10L, "任务A", "TASK-A")));

        AiReviewRecordEntity record = new AiReviewRecordEntity();
        record.setId(100L);
        record.setTaskId(10L);
        record.setSubmissionId(20L);
        record.setSubmissionVersionId(21L);
        record.setPlatformKey("deepseek");
        record.setModelId("deepseek-chat");
        record.setStatus("SUCCESS");
        record.setVerdict("PASS");
        record.setPromptSnapshot("secret prompt");
        record.setRawResponseText("secret response");
        record.setStartedAt(Instant.now());
        when(aiReviewRecordMapper.selectById(100L)).thenReturn(record);
        when(taskMapper.selectById(10L)).thenReturn(taskEntity(10L, "任务A", "TASK-A"));

        AiReviewLlmAttemptEntity attempt = new AiReviewLlmAttemptEntity();
        attempt.setAttemptNo(1);
        attempt.setPlatformKey("deepseek");
        attempt.setModelId("deepseek-chat");
        attempt.setPromptSnapshot("attempt prompt");
        attempt.setResponseSnapshot("attempt response");
        attempt.setSuccessFlag(1);
        attempt.setTraceabilityStatus("LEGACY_BACKFILLED");
        when(aiReviewLlmAttemptMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(attempt));
        when(submissionStatusHistoryMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        AiReviewObservabilityRecordDetail detail = service.ownerRecordDetail(100L);

        assertThat(detail.promptSnapshot()).isNull();
        assertThat(detail.rawResponseText()).isNull();
        assertThat(detail.attempts().getFirst().promptSnapshot()).isNull();
        assertThat(detail.attempts().getFirst().responseSnapshot()).contains("attempt response");
        assertThat(detail.summary().modelId()).isNull();
        assertThat(detail.summary().platformKey()).isNull();
        assertThat(detail.summary().estimatedCost()).isNull();
        assertThat(detail.attempts().getFirst().modelId()).isNull();
    }

    @Test
    void ownerOverviewRedactsSensitiveFields() {
        when(currentUserContext.requireUserId()).thenReturn(2001L);
        when(taskMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(taskEntity(10L, "任务A", "TASK-A")));

        AiReviewRecordEntity record = new AiReviewRecordEntity();
        record.setId(100L);
        record.setTaskId(10L);
        record.setSubmissionId(20L);
        record.setSubmissionVersionId(21L);
        record.setPlatformKey("deepseek");
        record.setModelId("deepseek-chat");
        record.setStatus("SUCCESS");
        record.setVerdict("PASS");
        record.setAttemptCount(2);
        record.setTotalLatencyMs(1500);
        record.setTotalTokens(1200);
        record.setPromptTokens(800);
        record.setCompletionTokens(400);
        record.setTraceabilityStatus("FULL");
        record.setStartedAt(Instant.now().minusSeconds(600));
        record.setFinishedAt(Instant.now());

        when(aiReviewRecordMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(record));
        when(taskMapper.selectBatchIds(any())).thenReturn(List.of(taskEntity(10L, "任务A", "TASK-A")));

        AiReviewObservabilityOverview overview = service.ownerOverview(24);

        assertThat(overview.modelDistribution()).isEmpty();
        assertThat(overview.summary().estimatedCostLast24Hours()).isNull();
        assertThat(overview.summary().totalTokensLast24Hours()).isZero();
        assertThat(overview.topSlow().getFirst().modelId()).isNull();
        assertThat(overview.topSlow().getFirst().estimatedCost()).isNull();
    }

    @Test
    void adminRecordDetailIncludesSensitiveFields() {
        AiReviewRecordEntity record = new AiReviewRecordEntity();
        record.setId(100L);
        record.setTaskId(10L);
        record.setSubmissionId(20L);
        record.setSubmissionVersionId(21L);
        record.setPlatformKey("deepseek");
        record.setModelId("deepseek-chat");
        record.setStatus("SUCCESS");
        record.setVerdict("PASS");
        record.setPromptSnapshot("secret prompt");
        record.setRawResponseText("secret response");
        record.setStartedAt(Instant.now());
        when(aiReviewRecordMapper.selectById(100L)).thenReturn(record);
        when(taskMapper.selectById(10L)).thenReturn(taskEntity(10L, "任务A", "TASK-A"));
        when(aiReviewLlmAttemptMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());
        when(submissionStatusHistoryMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        AiReviewObservabilityRecordDetail detail = service.adminRecordDetail(100L);

        assertThat(detail.promptSnapshot()).isEqualTo("secret prompt");
        assertThat(detail.rawResponseText()).isEqualTo("secret response");
    }

    @Test
    void adminRecordsUsesPagination() {
        AiReviewRecordEntity record = new AiReviewRecordEntity();
        record.setId(100L);
        record.setTaskId(10L);
        record.setSubmissionId(20L);
        record.setSubmissionVersionId(21L);
        record.setPlatformKey("deepseek");
        record.setModelId("deepseek-chat");
        record.setStatus("SUCCESS");
        record.setVerdict("PASS");
        record.setStartedAt(Instant.now());

        Page<AiReviewRecordEntity> page = new Page<>(1, 20);
        page.setRecords(List.of(record));
        page.setTotal(1);
        when(aiReviewRecordMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(page);
        when(taskMapper.selectBatchIds(any())).thenReturn(List.of(taskEntity(10L, "任务A", "TASK-A")));

        assertThat(service.adminRecords(1, 20, null, null, null, null).page().list()).hasSize(1);
    }

    private static TaskEntity taskEntity(Long id, String title, String code) {
        TaskEntity task = new TaskEntity();
        task.setId(id);
        task.setTitle(title);
        task.setTaskCode(code);
        task.setDeletedFlag(0);
        return task;
    }
}
