package com.labelhub.infra.business.submission.workflow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.settings.TaskSettingsDocument;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionTransitionPolicy {
    private static final Set<String> APPEALABLE_STATUSES = Set.of(
            SubmissionStatus.REJECTED.name(),
            SubmissionStatus.AI_REJECTED.name());

    private final ObjectMapper objectMapper;
    private final ReviewRecordMapper reviewRecordMapper;

    public SubmissionTransitionPolicy(ObjectMapper objectMapper, ReviewRecordMapper reviewRecordMapper) {
        this.objectMapper = objectMapper;
        this.reviewRecordMapper = reviewRecordMapper;
    }

    public TransitionDecision evaluate(SubmissionEntity submission, TaskEntity task, SubmissionEvent event) {
        if (submission == null) {
            return TransitionDecision.block("SUBMISSION_NOT_FOUND");
        }
        return switch (event) {
            case WITHDRAW -> evaluateWithdraw(submission, task);
            case SUBMIT_APPEAL -> evaluateAppeal(submission, task);
            default -> TransitionDecision.allow();
        };
    }

    public boolean canWithdraw(SubmissionEntity submission, TaskEntity task) {
        return evaluateWithdraw(submission, task).allowed();
    }

    public boolean canAppeal(SubmissionEntity submission, TaskEntity task) {
        return evaluateAppeal(submission, task).allowed();
    }

    public String withdrawBlockReason(SubmissionEntity submission, TaskEntity task) {
        return evaluateWithdraw(submission, task).blockReason();
    }

    public String appealBlockReason(SubmissionEntity submission, TaskEntity task) {
        return evaluateAppeal(submission, task).blockReason();
    }

    private TransitionDecision evaluateWithdraw(SubmissionEntity submission, TaskEntity task) {
        var settings = resolveTaskSettings(task).withdraw();
        if (!settings.enabled()) {
            return TransitionDecision.block("WITHDRAW_DISABLED");
        }
        if (!settings.allowedBeforeStatuses().contains(submission.getCurrentStatus())) {
            return TransitionDecision.block("WITHDRAW_STATUS_NOT_ALLOWED");
        }
        int withdrawCount = submission.getWithdrawCount() == null ? 0 : submission.getWithdrawCount();
        if (settings.maxWithdrawCount() != null && withdrawCount >= settings.maxWithdrawCount()) {
            return TransitionDecision.block("WITHDRAW_LIMIT_REACHED");
        }
        if (hasHumanReviewDecision(submission.getId())) {
            return TransitionDecision.block("WITHDRAW_HUMAN_REVIEW_EXISTS");
        }
        return TransitionDecision.allow();
    }

    private TransitionDecision evaluateAppeal(SubmissionEntity submission, TaskEntity task) {
        var settings = resolveTaskSettings(task).appeal();
        if (!settings.enabled()) {
            return TransitionDecision.block("APPEAL_DISABLED");
        }
        if (!isAppealableStatus(submission.getCurrentStatus())) {
            return TransitionDecision.block("APPEAL_STATUS_NOT_ALLOWED");
        }
        int appealCount = submission.getAppealCount() == null ? 0 : submission.getAppealCount();
        if (settings.maxAppealsPerSubmission() != null && appealCount >= settings.maxAppealsPerSubmission()) {
            return TransitionDecision.block("APPEAL_LIMIT_REACHED");
        }
        if (settings.appealWindowHours() != null && settings.appealWindowHours() > 0) {
            Instant baseTime = submission.getFinalizedAt() != null ? submission.getFinalizedAt() : submission.getLastActionAt();
            if (baseTime != null
                    && Duration.between(baseTime, Instant.now()).toHours() >= settings.appealWindowHours()) {
                return TransitionDecision.block("APPEAL_WINDOW_EXPIRED");
            }
        }
        return TransitionDecision.allow();
    }

    private static boolean isAppealableStatus(String status) {
        return status != null && APPEALABLE_STATUSES.contains(status);
    }

    private boolean hasHumanReviewDecision(Long submissionId) {
        if (submissionId == null) {
            return false;
        }
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewRecordEntity::getSubmissionId, submissionId);
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0);
        wrapper.eq(ReviewRecordEntity::getIsFinalDecision, 1);
        Long count = reviewRecordMapper.selectCount(wrapper);
        return count != null && count > 0;
    }

    private TaskSettingsDocument resolveTaskSettings(TaskEntity task) {
        if (task == null || task.getSettingsJson() == null || task.getSettingsJson().isBlank()) {
            return TaskSettingsDocument.defaults();
        }
        try {
            Map<String, Object> json = objectMapper.readValue(task.getSettingsJson(), new TypeReference<>() {
            });
            return TaskSettingsDocument.from(json);
        } catch (Exception ex) {
            return TaskSettingsDocument.defaults();
        }
    }

    public record TransitionDecision(boolean allowed, String blockReason) {
        static TransitionDecision allow() {
            return new TransitionDecision(true, null);
        }

        static TransitionDecision block(String blockReason) {
            return new TransitionDecision(false, blockReason);
        }
    }
}
