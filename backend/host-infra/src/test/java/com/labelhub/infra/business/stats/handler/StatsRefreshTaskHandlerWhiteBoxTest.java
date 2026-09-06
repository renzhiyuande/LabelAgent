package com.labelhub.infra.business.stats.handler;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.business.stats.service.DbStatsService;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — StatsRefreshTaskHandler")
class StatsRefreshTaskHandlerWhiteBoxTest {

    @Mock
    private DbStatsService statsService;

    @Test
    @DisplayName("WB-ASYNC-006: handle 解析 payload 并刷新任务统计快照")
    void wbAsync006_handleRefreshesTaskStatsSnapshotFromPayload() {
        StatsRefreshTaskHandler handler = new StatsRefreshTaskHandler(statsService, new ObjectMapper());
        AsyncTaskEntity task = new AsyncTaskEntity();
        task.setPayloadJson("""
                {"bizType":"TASK_STATS","taskId":910230000001}
                """);

        handler.handle(task);

        verify(statsService).refreshTaskStatsSnapshot(eq(910230000001L));
    }

    @Test
    @DisplayName("WB-ASYNC-007: handle 在 payload 缺 taskId 时回退到 bizId")
    void wbAsync007_handleFallsBackToBizIdWhenPayloadMissingTaskId() {
        StatsRefreshTaskHandler handler = new StatsRefreshTaskHandler(statsService, new ObjectMapper());
        AsyncTaskEntity task = new AsyncTaskEntity();
        task.setPayloadJson("{\"bizType\":\"TASK_STATS\"}");
        task.setBizType("TASK");
        task.setBizId(910230000001L);

        handler.handle(task);

        verify(statsService).refreshTaskStatsSnapshot(eq(910230000001L));
    }
}
