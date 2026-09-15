package com.labelhub.infra.business.review.handler;

import com.labelhub.infra.async.AsyncTaskHandler;
import com.labelhub.infra.business.review.orchestrator.AiReviewOrchestrator;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewTaskHandler implements AsyncTaskHandler {
    private static final Logger log = LoggerFactory.getLogger(AiReviewTaskHandler.class);

    private final AiReviewOrchestrator aiReviewOrchestrator;

    public AiReviewTaskHandler(AiReviewOrchestrator aiReviewOrchestrator) {
        this.aiReviewOrchestrator = aiReviewOrchestrator;
    }

    @Override
    public String taskType() {
        return "AI_REVIEW";
    }

    @Override
    public void handle(AsyncTaskEntity task) {
        int queueRetryNo = task.getRetryCount() == null ? 0 : task.getRetryCount();
        try {
            aiReviewOrchestrator.execute(task.getBizId(), task.getId(), queueRetryNo);
        } catch (Exception ex) {
            log.warn(
                    "AI review queue attempt failed task={} submission={} retry={} error={}",
                    task.getId(), task.getBizId(), queueRetryNo, ex.getMessage());
            throw ex;
        }
    }

    @Override
    public void onDeadLetter(AsyncTaskEntity task, String errorCode, String errorMessage) {
        int retryCount = task.getRetryCount() == null ? 0 : task.getRetryCount();
        aiReviewOrchestrator.handleTerminalFailure(
                task.getBizId(),
                task.getId(),
                retryCount,
                errorCode,
                errorMessage);
    }
}
