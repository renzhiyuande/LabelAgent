package com.labelhub.infra.async;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — 异步任务")
class AsyncTaskServiceWhiteBoxTest {

    @Mock
    private AsyncTaskMapper asyncTaskMapper;

    private AsyncTaskService asyncTaskService;

    @BeforeEach
    void setUp() {
        asyncTaskService = new AsyncTaskService(asyncTaskMapper, new ObjectMapper());
    }

    @Test
    @DisplayName("WB-ASYNC-001: enqueue AI_REVIEW 写入 PENDING 任务")
    void wbAsync001_enqueueInsertsPendingTask() {
        asyncTaskService.enqueue(
                "AI_REVIEW",
                "SUBMISSION",
                19001L,
                "submission:19001:round:1",
                10,
                Map.of("submissionId", 19001L));

        ArgumentCaptor<AsyncTaskEntity> captor = ArgumentCaptor.forClass(AsyncTaskEntity.class);
        verify(asyncTaskMapper).insert(captor.capture());
        AsyncTaskEntity entity = captor.getValue();
        assertThat(entity.getTaskType()).isEqualTo("AI_REVIEW");
        assertThat(entity.getBizType()).isEqualTo("SUBMISSION");
        assertThat(entity.getBizId()).isEqualTo(19001L);
        assertThat(entity.getBizKey()).isEqualTo("submission:19001:round:1");
        assertThat(entity.getStatus()).isEqualTo(AsyncTaskStatus.PENDING);
        assertThat(entity.getPriority()).isEqualTo(10);
        assertThat(entity.getPayloadJson()).contains("submissionId");
    }

    @Test
    @DisplayName("WB-ASYNC-003: cancelOpenTasks 取消 PENDING/RUNNING 关联任务")
    void wbAsync003_cancelOpenTasksMarksCanceled() {
        AsyncTaskEntity pending = openTask(1L, AsyncTaskStatus.PENDING);
        AsyncTaskEntity running = openTask(2L, AsyncTaskStatus.RUNNING);
        when(asyncTaskMapper.selectList(any())).thenReturn(List.of(pending, running));
        when(asyncTaskMapper.updateById(org.mockito.ArgumentMatchers.<AsyncTaskEntity>any()))
                .thenReturn(1);

        int canceled = asyncTaskService.cancelOpenTasks("AI_REVIEW", "SUBMISSION", 19001L);

        assertThat(canceled).isEqualTo(2);
        assertThat(pending.getStatus()).isEqualTo(AsyncTaskStatus.CANCELED);
        assertThat(running.getStatus()).isEqualTo(AsyncTaskStatus.CANCELED);
        assertThat(pending.getCanceledAt()).isNotNull();
        assertThat(running.getCanceledAt()).isNotNull();
    }

    private static AsyncTaskEntity openTask(long id, String status) {
        AsyncTaskEntity entity = new AsyncTaskEntity();
        entity.setId(id);
        entity.setTaskType("AI_REVIEW");
        entity.setBizType("SUBMISSION");
        entity.setBizId(19001L);
        entity.setStatus(status);
        return entity;
    }
}
