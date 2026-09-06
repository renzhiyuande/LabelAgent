package com.labelhub.infra.business.stats.handler;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.business.stats.service.DbStatsService;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — StatsBackfillTaskHandler")
class StatsBackfillTaskHandlerWhiteBoxTest {

    @Mock
    private DbStatsService statsService;

    @Test
    @DisplayName("WB-ASYNC-005: handle 解析 payload 并调用 backfillDailyStats")
    void wbAsync005_handleBackfillsDailyStatsForDateRange() {
        StatsBackfillTaskHandler handler = new StatsBackfillTaskHandler(statsService, new ObjectMapper());
        AsyncTaskEntity task = new AsyncTaskEntity();
        task.setPayloadJson("""
                {"from":"2026-06-01","to":"2026-06-03"}
                """);

        handler.handle(task);

        verify(statsService).backfillDailyStats(eq(LocalDate.parse("2026-06-01")), eq(LocalDate.parse("2026-06-03")));
    }
}
