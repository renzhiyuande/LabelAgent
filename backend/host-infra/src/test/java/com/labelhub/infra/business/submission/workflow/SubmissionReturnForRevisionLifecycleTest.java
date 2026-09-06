package com.labelhub.infra.business.submission.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.infra.business.assignment.workflow.AssignmentStateMachineService;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.statemachine.AssignmentStatus;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("SubmissionReturnForRevisionLifecycle")
class SubmissionReturnForRevisionLifecycleTest {
    @Mock
    private SubmissionMapper submissionMapper;
    @Mock
    private AssignmentMapper assignmentMapper;
    @Mock
    private AiReviewRecordMapper aiReviewRecordMapper;
    @Mock
    private SubmissionStateMachineService submissionStateMachineService;
    @Mock
    private AssignmentStateMachineService assignmentStateMachineService;

    private SubmissionReturnForRevisionLifecycle lifecycle;

    @BeforeEach
    void setUp() {
        lifecycle = new SubmissionReturnForRevisionLifecycle(
                submissionMapper,
                assignmentMapper,
                aiReviewRecordMapper,
                submissionStateMachineService,
                assignmentStateMachineService);
    }

    @Test
    @DisplayName("AI_REJECTED 打开工作台时自动打回为 NEEDS_REVISION 并重新打开 assignment")
    void reconcileAiRejectedTransitionsAndReopensAssignment() {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(100L);
        submission.setDeletedFlag(0);
        submission.setCurrentStatus(SubmissionStatus.AI_REJECTED.name());
        submission.setAssignmentId(200L);
        submission.setReturnCount(0);

        SubmissionEntity transitioned = new SubmissionEntity();
        transitioned.setId(100L);
        transitioned.setDeletedFlag(0);
        transitioned.setCurrentStatus(SubmissionStatus.NEEDS_REVISION.name());
        transitioned.setAssignmentId(200L);
        transitioned.setReturnCount(1);
        transitioned.setLastReturnReasonText("AI 驳回意见");

        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setId(200L);
        assignment.setDeletedFlag(0);
        assignment.setStatus(AssignmentStatus.SUBMITTED.name());
        assignment.setClosedAt(java.time.Instant.now());

        AssignmentEntity reopened = new AssignmentEntity();
        reopened.setId(200L);
        reopened.setDeletedFlag(0);
        reopened.setStatus(AssignmentStatus.CLAIMED.name());
        reopened.setClosedAt(null);

        when(submissionStateMachineService.canTransition(100L, SubmissionEvent.RETURN_FOR_REVISION))
                .thenReturn(true);
        when(submissionMapper.selectById(100L)).thenReturn(submission, transitioned, transitioned);
        when(assignmentMapper.selectById(200L)).thenReturn(assignment, reopened);
        when(assignmentStateMachineService.canTransition(200L, AssignmentEvent.WITHDRAW_SUBMISSION))
                .thenReturn(true);

        SubmissionEntity result = lifecycle.reconcileAiRejectedIfNeeded(submission);

        verify(submissionStateMachineService).transition(100L, SubmissionEvent.RETURN_FOR_REVISION);
        verify(assignmentStateMachineService).transition(200L, AssignmentEvent.WITHDRAW_SUBMISSION);
        assertThat(result.getCurrentStatus()).isEqualTo(SubmissionStatus.NEEDS_REVISION.name());
    }
}
