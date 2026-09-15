package com.labelhub.infra.async;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
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
    @DisplayName("WB-ASYNC-002: poll claim PENDING 后仅由 lease owner 条件更新 SUCCESS")
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
                assertThat(task.getStatus()).isEqualTo(AsyncTaskStatus.RUNNING);
                assertThat(task.getWorkerId()).isNotBlank();
            }
        }));
        AsyncTaskWorker worker = new AsyncTaskWorker(asyncTaskMapper, registry, 10, 120_000L);

        // recoverZombieTasks sees none; fetchCandidates returns this pending task.
        when(asyncTaskMapper.selectList(any())).thenReturn(List.of(), List.of(pending));
        when(asyncTaskMapper.update(any(AsyncTaskEntity.class), any(Wrapper.class))).thenReturn(1);
        when(asyncTaskMapper.selectById(501L)).thenReturn(pending);

        worker.poll();
        worker.shutdown();

        assertThat(handled).isTrue();
        ArgumentCaptor<AsyncTaskEntity> updates = ArgumentCaptor.forClass(AsyncTaskEntity.class);
        verify(asyncTaskMapper, times(2)).update(updates.capture(), any(Wrapper.class));
        List<AsyncTaskEntity> values = updates.getAllValues();
        assertThat(values.get(0).getStatus()).isEqualTo(AsyncTaskStatus.RUNNING);
        assertThat(values.get(1).getStatus()).isEqualTo(AsyncTaskStatus.SUCCESS);
        assertThat(values.get(1).getFinishedAt()).isNotNull();
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
