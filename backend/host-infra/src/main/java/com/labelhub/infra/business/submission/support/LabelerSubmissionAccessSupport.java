package com.labelhub.infra.business.submission.support;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.system.CurrentUserContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LabelerSubmissionAccessSupport {

    private final SubmissionMapper submissionMapper;
    private final AssignmentMapper assignmentMapper;
    private final SubmissionCurrentSupport submissionCurrentSupport;
    private final CurrentUserContext currentUserContext;

    public LabelerSubmissionAccessSupport(
            SubmissionMapper submissionMapper,
            AssignmentMapper assignmentMapper,
            SubmissionCurrentSupport submissionCurrentSupport,
            CurrentUserContext currentUserContext) {
        this.submissionMapper = submissionMapper;
        this.assignmentMapper = assignmentMapper;
        this.submissionCurrentSupport = submissionCurrentSupport;
        this.currentUserContext = currentUserContext;
    }

    public AssignmentEntity requireOwnedAssignment(Long assignmentId) {
        AssignmentEntity assignment = assignmentMapper.selectById(assignmentId);
        if (assignment == null || assignment.getDeletedFlag() == null || assignment.getDeletedFlag() != 0) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        if (!currentUserContext.requireUserId().equals(assignment.getLabelerId())) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
        return assignment;
    }

    public SubmissionEntity requireOwnedSubmission(Long submissionId) {
        SubmissionEntity entity = submissionMapper.selectById(submissionId);
        if (entity == null || entity.getDeletedFlag() == null || entity.getDeletedFlag() != 0) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        if (!submissionCurrentSupport.isCurrentSubmission(entity)) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        Long userId = currentUserContext.requireUserId();
        if (!userId.equals(entity.getLabelerId())) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
        return entity;
    }
}
