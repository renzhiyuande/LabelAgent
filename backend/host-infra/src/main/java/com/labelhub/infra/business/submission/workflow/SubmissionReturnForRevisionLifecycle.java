package com.labelhub.infra.business.submission.workflow;

import com.labelhub.infra.business.assignment.workflow.AssignmentStateMachineService;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.statemachine.AssignmentStatus;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 将提交打回为可改稿状态（NEEDS_REVISION），并重新打开 assignment 供标注员继续作答。
 */
@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionReturnForRevisionLifecycle {
    private final SubmissionMapper submissionMapper;
    private final AssignmentMapper assignmentMapper;
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final SubmissionStateMachineService submissionStateMachineService;
    private final AssignmentStateMachineService assignmentStateMachineService;

    public SubmissionReturnForRevisionLifecycle(
            SubmissionMapper submissionMapper,
            AssignmentMapper assignmentMapper,
            AiReviewRecordMapper aiReviewRecordMapper,
            SubmissionStateMachineService submissionStateMachineService,
            AssignmentStateMachineService assignmentStateMachineService) {
        this.submissionMapper = submissionMapper;
        this.assignmentMapper = assignmentMapper;
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.submissionStateMachineService = submissionStateMachineService;
        this.assignmentStateMachineService = assignmentStateMachineService;
    }

    @Transactional
    public SubmissionEntity returnForRevisionIfAllowed(Long submissionId, String commentText) {
        if (submissionId == null) {
            return null;
        }
        if (!submissionStateMachineService.canTransition(submissionId, SubmissionEvent.RETURN_FOR_REVISION)) {
            return submissionMapper.selectById(submissionId);
        }
        submissionStateMachineService.transition(submissionId, SubmissionEvent.RETURN_FOR_REVISION);
        return applySideEffects(submissionId, commentText);
    }

    @Transactional
    public SubmissionEntity reconcileAiRejectedIfNeeded(SubmissionEntity submission) {
        if (submission == null || !SubmissionStatus.AI_REJECTED.name().equals(submission.getCurrentStatus())) {
            return submission;
        }
        String comment = submission.getLastReturnReasonText();
        if (comment == null || comment.isBlank()) {
            comment = resolveAiReviewSummary(submission.getLastAiReviewId());
        }
        return returnForRevisionIfAllowed(submission.getId(), comment);
    }

    private SubmissionEntity applySideEffects(Long submissionId, String commentText) {
        SubmissionEntity latest = submissionMapper.selectById(submissionId);
        if (latest == null || latest.getDeletedFlag() == 1) {
            return latest;
        }
        latest.setLastReturnReasonText(commentText == null ? null : commentText.trim());
        latest.setRevisionRequiredAt(Instant.now());
        latest.setReturnCount((latest.getReturnCount() == null ? 0 : latest.getReturnCount()) + 1);
        latest.setCurrentReviewLevel(null);
        latest.setNextReviewLevel(null);
        latest.setFinalizedAt(Instant.now());
        latest.setLastActionCode("RETURN");
        latest.setLastActionAt(Instant.now());
        latest.setUpdatedAt(Instant.now());
        submissionMapper.updateById(latest);
        resumeAssignmentAfterReviewReturn(latest.getAssignmentId());
        return submissionMapper.selectById(submissionId);
    }

    private void resumeAssignmentAfterReviewReturn(Long assignmentId) {
        if (assignmentId == null) {
            return;
        }
        AssignmentEntity assignment = assignmentMapper.selectById(assignmentId);
        if (assignment == null || assignment.getDeletedFlag() == 1) {
            return;
        }
        if (AssignmentStatus.CLAIMED.name().equals(assignment.getStatus())) {
            if (assignment.getClosedAt() != null) {
                assignment.setClosedAt(null);
                assignment.setUpdatedAt(Instant.now());
                assignmentMapper.updateById(assignment);
            }
            return;
        }
        if (!AssignmentStatus.SUBMITTED.name().equals(assignment.getStatus())) {
            return;
        }
        if (assignmentStateMachineService.canTransition(assignmentId, AssignmentEvent.WITHDRAW_SUBMISSION)) {
            assignmentStateMachineService.transition(assignmentId, AssignmentEvent.WITHDRAW_SUBMISSION);
        }
        AssignmentEntity refreshed = assignmentMapper.selectById(assignmentId);
        if (refreshed == null || refreshed.getDeletedFlag() == 1) {
            return;
        }
        refreshed.setClosedAt(null);
        refreshed.setUpdatedAt(Instant.now());
        assignmentMapper.updateById(refreshed);
    }

    private String resolveAiReviewSummary(Long aiReviewId) {
        if (aiReviewId == null) {
            return null;
        }
        AiReviewRecordEntity record = aiReviewRecordMapper.selectById(aiReviewId);
        if (record == null || record.getDeletedFlag() == 1) {
            return null;
        }
        String summary = record.getSummaryText();
        return summary == null || summary.isBlank() ? null : summary.trim();
    }
}
