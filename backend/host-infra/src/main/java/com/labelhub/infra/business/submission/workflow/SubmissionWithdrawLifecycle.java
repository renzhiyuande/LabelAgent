package com.labelhub.infra.business.submission.workflow;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.business.assignment.workflow.AssignmentStateMachineService;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.statemachine.SubmissionEvent;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionWithdrawLifecycle {
    private final SubmissionMapper submissionMapper;
    private final AssignmentMapper assignmentMapper;
    private final SubmissionStateMachineService submissionStateMachineService;
    private final AssignmentStateMachineService assignmentStateMachineService;
    private final AsyncTaskService asyncTaskService;

    public SubmissionWithdrawLifecycle(
            SubmissionMapper submissionMapper,
            AssignmentMapper assignmentMapper,
            SubmissionStateMachineService submissionStateMachineService,
            AssignmentStateMachineService assignmentStateMachineService,
            AsyncTaskService asyncTaskService) {
        this.submissionMapper = submissionMapper;
        this.assignmentMapper = assignmentMapper;
        this.submissionStateMachineService = submissionStateMachineService;
        this.assignmentStateMachineService = assignmentStateMachineService;
        this.asyncTaskService = asyncTaskService;
    }

    @Transactional
    public SubmissionEntity withdraw(SubmissionEntity submission, AssignmentEntity assignment) {
        if (submission == null || submission.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        if (assignment == null || assignment.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }

        submissionStateMachineService.transition(submission.getId(), SubmissionEvent.WITHDRAW);
        SubmissionEntity refreshed = submissionMapper.selectById(submission.getId());
        refreshed.setWithdrawCount((refreshed.getWithdrawCount() == null ? 0 : refreshed.getWithdrawCount()) + 1);
        refreshed.setLastWithdrawnAt(Instant.now());
        refreshed.setLastActionCode("WITHDRAW");
        refreshed.setLastActionAt(Instant.now());
        refreshed.setCurrentReviewLevel(null);
        refreshed.setNextReviewLevel(null);
        refreshed.setRevisionRequiredAt(null);
        refreshed.setRevisionDeadlineAt(null);
        refreshed.setFinalizedAt(null);
        refreshed.setUpdatedAt(Instant.now());
        submissionMapper.updateById(refreshed);

        assignmentStateMachineService.transition(assignment.getId(), AssignmentEvent.WITHDRAW_SUBMISSION);
        AssignmentEntity assignmentRefreshed = assignmentMapper.selectById(assignment.getId());
        assignmentRefreshed.setClosedAt(null);
        assignmentRefreshed.setUpdatedAt(Instant.now());
        assignmentMapper.updateById(assignmentRefreshed);

        asyncTaskService.cancelOpenTasks("AI_REVIEW", "SUBMISSION", submission.getId());
        return submissionMapper.selectById(submission.getId());
    }
}
