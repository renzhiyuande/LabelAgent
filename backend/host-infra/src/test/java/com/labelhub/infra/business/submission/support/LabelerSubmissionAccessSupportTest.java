package com.labelhub.infra.business.submission.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.infra.statemachine.SubmissionStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LabelerSubmissionAccessSupportTest {

    @Mock
    private SubmissionMapper submissionMapper;

    @Mock
    private AssignmentMapper assignmentMapper;

    @Mock
    private SubmissionCurrentSupport submissionCurrentSupport;

    @Mock
    private CurrentUserContext currentUserContext;

    @InjectMocks
    private LabelerSubmissionAccessSupport support;

    @Test
    void requireOwnedSubmission_allowsCurrentSubmissionForOwner() {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(10L);
        submission.setLabelerId(1001L);
        submission.setIsCurrent(SubmissionCurrentSupport.CURRENT_FLAG);
        submission.setDeletedFlag(0);

        when(currentUserContext.requireUserId()).thenReturn(1001L);
        when(submissionMapper.selectById(10L)).thenReturn(submission);
        when(submissionCurrentSupport.isCurrentSubmission(submission)).thenReturn(true);

        SubmissionEntity result = support.requireOwnedSubmission(10L);
        assertEquals(10L, result.getId());
    }

    @Test
    void requireOwnedSubmission_rejectsArchivedSubmission() {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(10L);
        submission.setLabelerId(1001L);
        submission.setIsCurrent(null);
        submission.setCurrentStatus(SubmissionStatus.ABANDONED.name());
        submission.setDeletedFlag(0);

        when(submissionMapper.selectById(10L)).thenReturn(submission);
        when(submissionCurrentSupport.isCurrentSubmission(submission)).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () -> support.requireOwnedSubmission(10L));
        assertEquals(ErrorCode.SUBMISSION_NOT_FOUND, ex.errorCode());
    }

    @Test
    void requireOwnedSubmission_rejectsOtherLabeler() {
        SubmissionEntity submission = new SubmissionEntity();
        submission.setId(10L);
        submission.setLabelerId(2002L);
        submission.setIsCurrent(SubmissionCurrentSupport.CURRENT_FLAG);
        submission.setDeletedFlag(0);

        when(currentUserContext.requireUserId()).thenReturn(1001L);
        when(submissionMapper.selectById(10L)).thenReturn(submission);
        when(submissionCurrentSupport.isCurrentSubmission(submission)).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () -> support.requireOwnedSubmission(10L));
        assertEquals(ErrorCode.AUTH_FORBIDDEN, ex.errorCode());
    }
}
