package com.labelhub.infra.business.submission.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.business.assignment.workflow.AssignmentStateMachineService;
import com.labelhub.infra.business.review.support.ReviewWorkflowResolver;
import com.labelhub.core.lowcode.form.TemplateSubmissionDataValidator;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.SubmissionVersionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.SubmissionVersionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.statemachine.AssignmentStatus;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import java.util.Map;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/**
 * P0 白盒：标注提交生命周期（WB-SUB-006 ~ WB-SUB-011）
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("P0 白盒 — Submission 工作流")
class SubmissionWorkflowWhiteBoxTest {

    @Mock
    private SubmissionMapper submissionMapper;
    @Mock
    private SubmissionVersionMapper submissionVersionMapper;
    @Mock
    private SubmissionStateMachineService submissionStateMachineService;
    @Mock
    private AsyncTaskService asyncTaskService;
    @Mock
    private TemplateSubmissionDataValidator templateSubmissionDataValidator;
    @Mock
    private AssignmentMapper assignmentMapper;
    @Mock
    private TaskMapper taskMapper;
    @Mock
    private ReviewWorkflowResolver reviewWorkflowResolver;
    @Mock
    private AssignmentStateMachineService assignmentStateMachineService;

    private SubmissionSubmitLifecycle submitLifecycle;
    private SubmissionWithdrawLifecycle withdrawLifecycle;

    @BeforeAll
    static void initMybatisPlusEntityMetadata() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant =
                new MapperBuilderAssistant(configuration, SubmissionWorkflowWhiteBoxTest.class.getName());
        TableInfoHelper.initTableInfo(assistant, SubmissionEntity.class);
        TableInfoHelper.initTableInfo(assistant, SubmissionVersionEntity.class);
    }

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        submitLifecycle = new SubmissionSubmitLifecycle(
                submissionMapper,
                submissionVersionMapper,
                submissionStateMachineService,
                objectMapper,
                asyncTaskService,
                templateSubmissionDataValidator,
                taskMapper,
                reviewWorkflowResolver);
        withdrawLifecycle = new SubmissionWithdrawLifecycle(
                submissionMapper,
                assignmentMapper,
                submissionStateMachineService,
                assignmentStateMachineService,
                asyncTaskService);
    }

    @Test
    @DisplayName("WB-SUB-006: submit 触发双状态机迁移并入队 AI 审核")
    void wbSub006_submitTransitionsBothStateMachinesAndEnqueuesAiReview() {
        SubmissionEntity submission = draftSubmission(1L, 10L);
        submission.setCurrentTemplateVersionId(100L);
        TaskEntity task = taskWithAiReviewEnabled(10L);
        Map<String, Object> payload = Map.of("label_text", "A", "score", 95);

        when(taskMapper.selectById(10L)).thenReturn(task);
        when(submissionStateMachineService.transition(1L, SubmissionEvent.SUBMIT))
                .thenReturn(SubmissionStatus.SUBMITTED);
        when(submissionMapper.selectById(1L)).thenReturn(submission);
        when(submissionStateMachineService.canTransition(1L, SubmissionEvent.ENTER_AI_REVIEW)).thenReturn(true);
        when(submissionVersionMapper.selectOne(any())).thenReturn(null);

        submitLifecycle.submit(submission, payload);

        verify(asyncTaskService).enqueue(eq("AI_REVIEW"), eq("SUBMISSION"), eq(1L), any(), any(Integer.class), any());
        verify(submissionStateMachineService).transition(1L, SubmissionEvent.SUBMIT);
        verify(submissionStateMachineService).transition(1L, SubmissionEvent.ENTER_AI_REVIEW);
    }

    @Test
    @DisplayName("WB-SUB-007: 非法 schema payload 拒绝提交")
    void wbSub007_submitRejectsInvalidSchemaPayload() {
        SubmissionEntity submission = draftSubmission(2L, 10L);
        submission.setCurrentTemplateVersionId(100L);
        doThrow(new BusinessException(ErrorCode.VALIDATION_ERROR, "schema invalid"))
                .when(templateSubmissionDataValidator)
                .validateAnnotateSubmitData(any(), any());

        assertThatThrownBy(() -> submitLifecycle.submit(submission, Map.of("bad", true)))
                .isInstanceOf(BusinessException.class);
        verify(submissionStateMachineService, never()).transition(any(), any());
        verify(asyncTaskService, never()).enqueue(any(), any(), any(), any(), any(Integer.class), any());
    }

    @Test
    @DisplayName("WB-SUB-008: RESUBMIT_AFTER_AI_APPEAL 设置人工审核级别")
    void wbSub008_resubmitAfterAiAppealAppliesHumanReviewLevels() {
        SubmissionEntity submission = draftSubmission(3L, 10L);
        submission.setCurrentTemplateVersionId(100L);
        submission.setCurrentStatus(SubmissionStatus.APPEAL_APPROVED_SKIP_AI.name());
        TaskEntity task = taskWithAiReviewEnabled(10L);
        task.setReviewWorkflowJson("{\"levels\":[{\"key\":\"L1\",\"label\":\"初审\"}]}");
        when(taskMapper.selectById(10L)).thenReturn(task);
        when(reviewWorkflowResolver.firstLevel(any())).thenReturn("L1");
        when(reviewWorkflowResolver.nextLevel(any(), eq("L1"))).thenReturn(null);
        when(submissionStateMachineService.transition(3L, SubmissionEvent.RESUBMIT_AFTER_AI_APPEAL))
                .thenReturn(SubmissionStatus.SUBMITTED);
        when(submissionMapper.selectById(3L)).thenReturn(submission);
        when(submissionVersionMapper.selectOne(any())).thenReturn(null);

        submitLifecycle.submit(submission, Map.of("label_text", "B"));

        verify(reviewWorkflowResolver).firstLevel(any());
        verify(asyncTaskService, never()).enqueue(any(), any(), any(), any(), any(Integer.class), any());
    }

    @Test
    @DisplayName("WB-SUB-009: SUBMITTED 撤回 → Submission DRAFT + Assignment CLAIMED")
    void wbSub009_withdrawFromSubmittedReopensAssignment() {
        SubmissionEntity submission = submittedSubmission(4L);
        AssignmentEntity assignment = submittedAssignment(40L);
        SubmissionEntity refreshed = submittedSubmission(4L);
        refreshed.setCurrentStatus(SubmissionStatus.DRAFT.name());
        AssignmentEntity assignmentRefreshed = submittedAssignment(40L);
        assignmentRefreshed.setStatus(AssignmentStatus.CLAIMED.name());

        when(submissionStateMachineService.transition(4L, SubmissionEvent.WITHDRAW))
                .thenReturn(SubmissionStatus.DRAFT);
        when(assignmentStateMachineService.transition(40L, AssignmentEvent.WITHDRAW_SUBMISSION))
                .thenReturn(AssignmentStatus.CLAIMED);
        when(submissionMapper.selectById(4L)).thenReturn(refreshed);
        when(assignmentMapper.selectById(40L)).thenReturn(assignmentRefreshed);

        SubmissionEntity result = withdrawLifecycle.withdraw(submission, assignment);

        assertThat(result.getCurrentStatus()).isEqualTo(SubmissionStatus.DRAFT.name());
        verify(assignmentStateMachineService).transition(40L, AssignmentEvent.WITHDRAW_SUBMISSION);
    }

    @Test
    @DisplayName("WB-SUB-010: AI_REVIEWING 撤回取消排队 AI 任务")
    void wbSub010_withdrawFromAiReviewingCancelsOpenAiTasks() {
        SubmissionEntity submission = aiReviewingSubmission(5L);
        AssignmentEntity assignment = submittedAssignment(50L);
        SubmissionEntity refreshed = aiReviewingSubmission(5L);
        refreshed.setCurrentStatus(SubmissionStatus.DRAFT.name());

        when(submissionStateMachineService.transition(5L, SubmissionEvent.WITHDRAW))
                .thenReturn(SubmissionStatus.DRAFT);
        when(assignmentStateMachineService.transition(50L, AssignmentEvent.WITHDRAW_SUBMISSION))
                .thenReturn(AssignmentStatus.CLAIMED);
        when(submissionMapper.selectById(5L)).thenReturn(refreshed);
        when(assignmentMapper.selectById(50L)).thenReturn(assignment);

        withdrawLifecycle.withdraw(submission, assignment);

        verify(asyncTaskService).cancelOpenTasks(eq("AI_REVIEW"), eq("SUBMISSION"), eq(5L));
    }

    @Test
    @DisplayName("WB-SUB-011: APPROVED 态不可撤回")
    void wbSub011_withdrawRejectedWhenApproved() {
        SubmissionEntity submission = approvedSubmission(6L);
        AssignmentEntity assignment = submittedAssignment(60L);

        doThrow(new BusinessException(ErrorCode.TRANSITION_INVALID, "Cannot withdraw approved submission"))
                .when(submissionStateMachineService)
                .transition(6L, SubmissionEvent.WITHDRAW);

        assertThatThrownBy(() -> withdrawLifecycle.withdraw(submission, assignment))
                .isInstanceOf(BusinessException.class);
    }

    private SubmissionEntity draftSubmission(Long id, Long taskId) {
        SubmissionEntity e = new SubmissionEntity();
        e.setId(id);
        e.setTaskId(taskId);
        e.setDeletedFlag(0);
        e.setCurrentStatus(SubmissionStatus.DRAFT.name());
        e.setSubmitCount(0);
        e.setCurrentRoundNo(1);
        return e;
    }

    private SubmissionEntity submittedSubmission(Long id) {
        SubmissionEntity e = draftSubmission(id, 10L);
        e.setCurrentStatus(SubmissionStatus.SUBMITTED.name());
        return e;
    }

    private SubmissionEntity aiReviewingSubmission(Long id) {
        SubmissionEntity e = draftSubmission(id, 10L);
        e.setCurrentStatus(SubmissionStatus.AI_REVIEWING.name());
        return e;
    }

    private SubmissionEntity approvedSubmission(Long id) {
        SubmissionEntity e = draftSubmission(id, 10L);
        e.setCurrentStatus(SubmissionStatus.APPROVED.name());
        return e;
    }

    private AssignmentEntity submittedAssignment(Long id) {
        AssignmentEntity e = new AssignmentEntity();
        e.setId(id);
        e.setDeletedFlag(0);
        e.setStatus(AssignmentStatus.SUBMITTED.name());
        return e;
    }

    private TaskEntity taskWithAiReviewEnabled(Long taskId) {
        TaskEntity task = new TaskEntity();
        task.setId(taskId);
        task.setDeletedFlag(0);
        task.setSettingsJson("{\"review\":{\"aiEnabled\":true}}");
        return task;
    }
}
