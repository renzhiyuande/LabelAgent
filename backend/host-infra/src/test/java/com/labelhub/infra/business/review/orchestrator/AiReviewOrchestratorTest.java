package com.labelhub.infra.business.review.orchestrator;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.review.AiReviewContext;
import com.labelhub.core.review.AiReviewEngine;
import com.labelhub.core.review.AiReviewResult;
import com.labelhub.infra.business.review.support.AiReviewMemoryRetriever;
import com.labelhub.infra.business.review.support.AiReviewRecordWriter;
import com.labelhub.infra.business.submission.support.SubmissionVersionReader;
import com.labelhub.infra.business.submission.workflow.SubmissionReturnForRevisionLifecycle;
import com.labelhub.infra.business.submission.workflow.SubmissionStateMachineService;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.entity.TemplateReviewDimensionEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.persistence.mapper.TemplateReviewDimensionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("P0 白盒 — AiReviewOrchestrator")
class AiReviewOrchestratorTest {
    @Mock
    private SubmissionMapper submissionMapper;
    @Mock
    private TaskItemMapper taskItemMapper;
    @Mock
    private TemplateVersionMapper templateVersionMapper;
    @Mock
    private TemplateReviewDimensionMapper templateReviewDimensionMapper;
    @Mock
    private AiReviewRecordMapper aiReviewRecordMapper;
    @Mock
    private SubmissionVersionReader submissionVersionReader;
    @Mock
    private SubmissionStateMachineService submissionStateMachineService;
    @Mock
    private SubmissionReturnForRevisionLifecycle submissionReturnForRevisionLifecycle;
    @Mock
    private AiReviewEngine aiReviewEngine;
    @Mock
    private AiReviewMemoryRetriever aiReviewMemoryRetriever;
    @Mock
    private AiReviewRecordWriter aiReviewRecordWriter;

    private AiReviewOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        orchestrator = new AiReviewOrchestrator(
                submissionMapper,
                taskItemMapper,
                templateVersionMapper,
                templateReviewDimensionMapper,
                aiReviewRecordMapper,
                submissionVersionReader,
                submissionStateMachineService,
                submissionReturnForRevisionLifecycle,
                aiReviewEngine,
                aiReviewMemoryRetriever,
                aiReviewRecordWriter,
                new ObjectMapper());
    }

    @Test
    @DisplayName("WB-REV-001: AI PASS 写入记录并触发 AI_PASS 迁移")
    void wbRev001_aiPassWritesRecordAndTransitions() {
        stubHappyPath("PASS");

        orchestrator.execute(100L, 900L);

        verify(aiReviewRecordWriter).writeSuccess(
                eq(100L), eq(200L), eq(300L), eq(400L), eq(1), eq(0), eq(900L), any(), any());
        verify(submissionStateMachineService).transition(100L, SubmissionEvent.AI_PASS);
    }

    @Test
    @DisplayName("WB-REV-002: AI REJECT 写入记录并触发 AI_REJECT 迁移")
    void wbRev002_aiRejectWritesRecordAndTransitions() {
        stubHappyPath("REJECT");
        when(submissionStateMachineService.canTransition(100L, SubmissionEvent.AI_REJECT))
                .thenReturn(true);

        orchestrator.execute(100L, 900L);

        verify(aiReviewRecordWriter).writeSuccess(
                eq(100L), eq(200L), eq(300L), eq(400L), eq(1), eq(0), eq(900L), any(), any());
        verify(submissionStateMachineService).transition(100L, SubmissionEvent.AI_REJECT);
        verify(submissionReturnForRevisionLifecycle).returnForRevisionIfAllowed(100L, "ok");
    }

    @Test
    @DisplayName("WB-REV-003: REQUIRE_HUMAN 直达人工审核队列")
    void wbRev003_requireHumanTransitionsToHumanReviewing() {
        stubHappyPath("REQUIRE_HUMAN");
        when(submissionStateMachineService.canTransition(100L, SubmissionEvent.AI_REQUIRE_HUMAN))
                .thenReturn(true);

        orchestrator.execute(100L, 900L);

        verify(submissionStateMachineService).transition(100L, SubmissionEvent.AI_REQUIRE_HUMAN);
    }

    @Test
    @DisplayName("WB-REV-004: Agent 失败写入失败记录并降级 REQUIRE_HUMAN")
    void wbRev004_agentFailureFallsBackToRequireHuman() {
        stubHappyPath(null);
        when(aiReviewEngine.review(any(AiReviewContext.class)))
                .thenThrow(new RuntimeException("Agent unavailable"));
        AiReviewRecordEntity failureRecord = new AiReviewRecordEntity();
        failureRecord.setId(501L);
        when(aiReviewRecordWriter.writeFailure(
                anyLong(), anyLong(), anyLong(), anyLong(), any(), anyInt(), anyLong(),
                any(), any(), any(), any()))
                .thenReturn(failureRecord);
        when(submissionStateMachineService.canTransition(100L, SubmissionEvent.AI_REQUIRE_HUMAN))
                .thenReturn(true);

        orchestrator.execute(100L, 900L);

        verify(aiReviewRecordWriter).writeFailure(
                eq(100L), eq(200L), eq(300L), eq(400L), eq(1), eq(0), eq(900L),
                eq("openai"), eq("gpt-4.1-mini"), eq("{}"), eq("Agent unavailable"));
        verify(submissionStateMachineService).transition(100L, SubmissionEvent.AI_REQUIRE_HUMAN);
        verify(aiReviewRecordWriter, never()).writeSuccess(any(), any(), any(), any(), any(), anyInt(), any(), any(), any());
    }

    private void stubHappyPath(String verdict) {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(100L);
        submission.setDeletedFlag(0);
        submission.setCurrentStatus(SubmissionStatus.AI_REVIEWING.name());
        submission.setCurrentTemplateVersionId(10L);
        submission.setCurrentVersionId(200L);
        submission.setTaskId(300L);
        submission.setAssignmentId(400L);
        submission.setItemId(500L);
        submission.setCurrentRoundNo(1);
        when(submissionMapper.selectById(100L)).thenReturn(submission);

        TemplateVersionEntity version = new TemplateVersionEntity();
        version.setId(10L);
        version.setDeletedFlag(0);
        version.setProviderPlatformKey("openai");
        version.setModelId("gpt-4.1-mini");
        version.setReviewPromptTemplate("Review");
        version.setReviewOutputSchemaJson("{}");
        when(templateVersionMapper.selectById(10L)).thenReturn(version);

        TaskItemEntity item = new TaskItemEntity();
        item.setPayloadJson("{\"prompt\":\"q\"}");
        when(taskItemMapper.selectById(500L)).thenReturn(item);
        when(submissionVersionReader.readSubmitDataByVersionId(200L)).thenReturn(Map.of("answer", "A"));

        TemplateReviewDimensionEntity dimension = new TemplateReviewDimensionEntity();
        dimension.setDimensionKey("accuracy");
        dimension.setDimensionName("准确性");
        dimension.setWeight(BigDecimal.ONE);
        dimension.setScoreMin(BigDecimal.ZERO);
        dimension.setScoreMax(BigDecimal.valueOf(100));
        dimension.setPassThreshold(BigDecimal.valueOf(70));
        dimension.setRejectThreshold(BigDecimal.valueOf(40));
        when(templateReviewDimensionMapper.selectList(any())).thenReturn(List.of(dimension));
        when(aiReviewRecordMapper.selectCount(any())).thenReturn(0L);
        when(aiReviewMemoryRetriever.loadRecentCases(10L, 100L)).thenReturn(List.of());

        if (verdict != null) {
            AiReviewResult result = new AiReviewResult(
                    "openai",
                    "gpt-4.1-mini",
                    verdict,
                    BigDecimal.valueOf(88),
                    "ok",
                    "prompt",
                    Map.of(),
                    Map.of("verdict", verdict),
                    "{}",
                    "req-1",
                    List.of());
            when(aiReviewEngine.review(any(AiReviewContext.class))).thenReturn(result);
            AiReviewRecordEntity successRecord = new AiReviewRecordEntity();
            successRecord.setId(500L);
            when(aiReviewRecordWriter.writeSuccess(
                    anyLong(), anyLong(), anyLong(), anyLong(), any(), anyInt(), anyLong(), any(), any()))
                    .thenReturn(successRecord);
            when(submissionStateMachineService.canTransition(100L, SubmissionEvent.AI_PASS))
                    .thenReturn(true);
            when(submissionStateMachineService.canTransition(100L, SubmissionEvent.AI_REJECT))
                    .thenReturn(true);
            when(submissionStateMachineService.canTransition(100L, SubmissionEvent.AI_REQUIRE_HUMAN))
                    .thenReturn(true);
        }

        when(submissionMapper.updateById(any(SubmissionEntity.class))).thenReturn(1);
    }
}
