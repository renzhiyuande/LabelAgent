package com.labelhub.app.review;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.labelhub.infra.business.review.handler.AiReviewTaskHandler;
import com.labelhub.infra.business.review.orchestrator.AiReviewOrchestrator;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.assertThrows;

class AiReviewTaskHandlerAsyncTest {

    @Test
    void queueAttemptMustPropagateEngineFailureToWorker() {
        AiReviewOrchestrator orchestrator = mock(AiReviewOrchestrator.class);
        AiReviewTaskHandler handler = new AiReviewTaskHandler(orchestrator);
        AsyncTaskEntity task = task(11L, 1);
        doThrow(new IllegalStateException("provider unavailable"))
                .when(orchestrator).execute(101L, 11L, 1);

        assertThrows<IllegalStateException>(() -> handler.handle(task));
        verify(orchestrator).execute(101L, 11L, 1);
    }

    @Test
    void deadLetterMustTriggerTerminalHumanFallback() {
        AiReviewOrchestrator orchestrator = mock(AiReviewOrchestrator.class);
        AiReviewTaskHandler handler = new AiReviewTaskHandler(orchestrator);
        AsyncTaskEntity task = task(12L, 3);

        handler.onDeadLetter(task, "TimeoutException", "agent timed out");

        verify(orchestrator).handleTerminalFailure(
                101L,
                12L,
                3,
                "TimeoutException",
                "agent timed out");
    }

    private static AsyncTaskEntity task(Long taskId, int retryCount) {
        AsyncTaskEntity task = new AsyncTaskEntity();
        task.setId(taskId);
        task.setTaskType("AI_REVIEW");
        task.setBizType("SUBMISSION");
        task.setBizId(101L);
        task.setRetryCount(retryCount);
        task.setMaxRetryCount(3);
        return task;
    }
}
