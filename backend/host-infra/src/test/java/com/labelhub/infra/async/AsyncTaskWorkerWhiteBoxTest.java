package com.labelhub.infra.async;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — AsyncTaskWorker")
class AsyncTaskWorkerWhiteBoxTest {

    @Mock
    private AsyncTaskMapper asyncTaskMapper;

    @Test
    @DisplayName("WB-ASYNC-002: poll 消费 PENDING 任务并标记 SUCCESS")
    void wbAsync002_pollClaimsPendingTaskAndMarksSuccess() {
        AsyncTaskEntity pending = pendingTask(501L, "AI_REVIEW");
        AtomicBoolean handled = new AtomicBoolean();
        AsyncTaskHandlerRegistry registry = new AsyncTaskHandlerRegistry(List.of(new AsyncTaskHandler() {
            @Override
            public String taskType() {
                return "AI_REVIEW";
            }

            @Override
            public void handle(AsyncTaskEntity task) {
                handled.set(true);
                assertThat(task.getId()).isEqualTo(501L);
            }
        }));
        AsyncTaskWorker worker = new AsyncTaskWorker(asyncTaskMapper, registry, 10, 120_000L);

        when(asyncTaskMapper.update(any(), any())).thenReturn(0, 1);
        when(asyncTaskMapper.selectList(any())).thenReturn(List.of(pending));
        when(asyncTaskMapper.selectById(501L)).thenReturn(pending);

        worker.poll();

        assertThat(handled).isTrue();
        ArgumentCaptor<AsyncTaskEntity> successCaptor = ArgumentCaptor.forClass(AsyncTaskEntity.class);
        verify(asyncTaskMapper).updateById(successCaptor.capture());
        assertThat(successCaptor.getValue().getStatus()).isEqualTo(AsyncTaskStatus.SUCCESS);
        assertThat(successCaptor.getValue().getFinishedAt()).isNotNull();
    }

    private static AsyncTaskEntity pendingTask(long id, String taskType) {
        AsyncTaskEntity entity = new AsyncTaskEntity();
        entity.setId(id);
        entity.setDeletedFlag(0);
        entity.setTaskType(taskType);
        entity.setStatus(AsyncTaskStatus.PENDING);
        entity.setPriority(10);
        entity.setNextRunAt(Instant.now().minusSeconds(5));
        entity.setRetryCount(0);
        entity.setMaxRetryCount(3);
        return entity;
    }
}
