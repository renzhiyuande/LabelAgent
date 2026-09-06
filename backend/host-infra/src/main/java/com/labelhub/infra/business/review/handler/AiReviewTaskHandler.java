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
        try {
            aiReviewOrchestrator.execute(task.getBizId(), task.getId());
        } catch (Exception ex) {
            log.error("AI review task {} failed for submission {}: {}", task.getId(), task.getBizId(), ex.getMessage(), ex);
            throw ex;
        }
    }
}
