package com.labelhub.infra.business.submission.workflow;

import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.SubmissionStatusHistoryEntity;
import com.labelhub.infra.persistence.mapper.SubmissionStatusHistoryMapper;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import java.time.Instant;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionStatusHistoryWriter {
    private final SubmissionStatusHistoryMapper submissionStatusHistoryMapper;
    private final CurrentUserProvider currentUserProvider;

    public SubmissionStatusHistoryWriter(
            SubmissionStatusHistoryMapper submissionStatusHistoryMapper,
            CurrentUserProvider currentUserProvider) {
        this.submissionStatusHistoryMapper = submissionStatusHistoryMapper;
        this.currentUserProvider = currentUserProvider;
    }

    public void recordTransition(SubmissionEntity submission, SubmissionStatus fromStatus, SubmissionStatus toStatus, SubmissionEvent event) {
        SubmissionStatusHistoryEntity history = new SubmissionStatusHistoryEntity();
        history.setSubmissionId(submission.getId());
        history.setSubmissionVersionId(submission.getCurrentVersionId());
        history.setTaskId(submission.getTaskId());
        history.setAssignmentId(submission.getAssignmentId());
        history.setFromStatus(fromStatus.name());
        history.setToStatus(toStatus.name());
        history.setActionCode(event.name());
        history.setReviewLevel(submission.getCurrentReviewLevel());
        history.setRoundNo(submission.getCurrentRoundNo() == null ? 1 : submission.getCurrentRoundNo());
        AuthenticatedUser user = resolveCurrentUser();
        history.setOperatorId(user == null ? null : user.userId());
        history.setOperatorType(resolveOperatorType(user, event));
        String traceId = TraceContext.currentTraceId();
        history.setRequestId(traceId);
        history.setIdempotencyKey(traceId + ":" + event.name() + ":" + submission.getId());
        history.setOccurredAt(Instant.now());
        submissionStatusHistoryMapper.insert(history);
    }

    private AuthenticatedUser resolveCurrentUser() {
        try {
            return currentUserProvider.currentUser();
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolveOperatorType(AuthenticatedUser user, SubmissionEvent event) {
        if (event == SubmissionEvent.AI_PASS || event == SubmissionEvent.AI_REJECT || event == SubmissionEvent.AI_REQUIRE_HUMAN) {
            return "AI";
        }
        if (user == null) {
            return "SYSTEM";
        }
        Set<String> roles = user.roles();
        Set<String> permissions = user.permissions();
        if (roles.contains("REVIEWER") || permissions.contains("business:reviewer:workbench")) {
            return "REVIEWER";
        }
        if (roles.contains("LABELER")
                || permissions.contains("business:labeler:workbench")
                || permissions.contains("business:labeler:submission")) {
            return "LABELER";
        }
        if (roles.contains("OWNER") || permissions.contains("business:task:update") || permissions.contains("business:task:read")) {
            return "OWNER";
        }
        return "SYSTEM";
    }
}
