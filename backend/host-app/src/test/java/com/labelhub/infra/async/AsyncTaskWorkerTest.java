package com.labelhub.infra.async;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AsyncTaskWorkerTest {
    private AsyncTaskWorker worker;

    @AfterEach
    void shutdownWorker() {
        if (worker != null) {
            worker.shutdown();
        }
    }

    @Test
    void handlerFailureShouldScheduleRetryBeforeDeadLetter() {
        AsyncTaskMapper mapper = mock(AsyncTaskMapper.class);
        AsyncTaskHandler handler = failingHandler("AI_REVIEW");
        AsyncTaskHandlerRegistry registry = new AsyncTaskHandlerRegistry(List.of(handler));
        AsyncTaskEntity task = task(1L, AsyncTaskStatus.PENDING, 0, 3, null);

        when(mapper.selectList(any())).thenReturn(List.of(), List.of(task));
        when(mapper.update(any(AsyncTaskEntity.class), any(Wrapper.class))).thenReturn(1);
        when(mapper.selectById(1L)).thenReturn(task);

        worker = new AsyncTaskWorker(mapper, registry, 10, 120_000, 1_000, 60_000, 30_000);
        worker.poll();

        ArgumentCaptor<AsyncTaskEntity> update = ArgumentCaptor.forClass(AsyncTaskEntity.class);
        verify(mapper).updateById(update.capture());
        assertThat(update.getValue().getStatus()).isEqualTo(AsyncTaskStatus.PENDING);
        assertThat(update.getValue().getRetryCount()).isEqualTo(1);
        assertThat(update.getValue().getNextRunAt()).isAfter(Instant.now().minusSeconds(1));
        verify(handler, times(0)).onDeadLetter(any(), any(), any());
    }

    @Test
    void exhaustedRetryShouldDeadLetterAndNotifyHandler() {
        AsyncTaskMapper mapper = mock(AsyncTaskMapper.class);
        AsyncTaskHandler handler = failingHandler("AI_REVIEW");
        AsyncTaskHandlerRegistry registry = new AsyncTaskHandlerRegistry(List.of(handler));
        AsyncTaskEntity task = task(2L, AsyncTaskStatus.PENDING, 2, 3, null);
        AsyncTaskEntity persisted = task(2L, AsyncTaskStatus.DEAD_LETTER, 3, 3, null);

        when(mapper.selectList(any())).thenReturn(List.of(), List.of(task));
        when(mapper.update(any(AsyncTaskEntity.class), any(Wrapper.class))).thenReturn(1);
        when(mapper.selectById(2L)).thenReturn(task, persisted);

        worker = new AsyncTaskWorker(mapper, registry, 10, 120_000, 1_000, 60_000, 30_000);
        worker.poll();

        verify(handler).onDeadLetter(
                persisted,
                IllegalStateException.class.getSimpleName(),
                "simulated provider failure");
    }

    @Test
    void staleRunningTaskShouldConsumeRetryBudgetAndEventuallyDeadLetter() {
        AsyncTaskMapper mapper = mock(AsyncTaskMapper.class);
        AsyncTaskHandler handler = mock(AsyncTaskHandler.class);
        when(handler.taskType()).thenReturn("AI_REVIEW");
        AsyncTaskHandlerRegistry registry = new AsyncTaskHandlerRegistry(List.of(handler));

        AsyncTaskEntity stale = task(3L, AsyncTaskStatus.RUNNING, 2, 3, "dead-worker");
        stale.setLockedAt(Instant.now().minusSeconds(300));
        AsyncTaskEntity persisted = task(3L, AsyncTaskStatus.DEAD_LETTER, 3, 3, null);

        when(mapper.selectList(any())).thenReturn(List.of(stale), List.of());
        when(mapper.update(any(AsyncTaskEntity.class), any(Wrapper.class))).thenReturn(1);
        when(mapper.selectById(3L)).thenReturn(persisted);

        worker = new AsyncTaskWorker(mapper, registry, 10, 120_000, 1_000, 60_000, 30_000);
        worker.poll();

        verify(handler).onDeadLetter(
                persisted,
                "CLAIM_TIMEOUT",
                "Worker lease expired before task completion");
    }

    private static AsyncTaskHandler failingHandler(String taskType) {
        AsyncTaskHandler handler = mock(AsyncTaskHandler.class);
        when(handler.taskType()).thenReturn(taskType);
        doThrow(new IllegalStateException("simulated provider failure")).when(handler).handle(any());
        return handler;
    }

    private static AsyncTaskEntity task(
            Long id,
            String status,
            int retryCount,
            int maxRetryCount,
            String workerId) {
        AsyncTaskEntity task = new AsyncTaskEntity();
        task.setId(id);
        task.setTaskType("AI_REVIEW");
        task.setBizType("SUBMISSION");
        task.setBizId(100L + id);
        task.setBizKey("ai-review:" + id);
        task.setStatus(status);
        task.setRetryCount(retryCount);
        task.setMaxRetryCount(maxRetryCount);
        task.setWorkerId(workerId);
        task.setNextRunAt(Instant.now().minusSeconds(1));
        task.setDeletedFlag(0);
        return task;
    }
}
