package com.labelhub.infra.business.stats.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.async.AsyncTaskHandler;
import com.labelhub.infra.business.stats.service.DbStatsService;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import java.time.LocalDate;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 统计回填异步任务处理器。从 payload 读取日期区间，调用 StatsService.backfillDailyStats。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class StatsBackfillTaskHandler implements AsyncTaskHandler {
    private static final Logger log = LoggerFactory.getLogger(StatsBackfillTaskHandler.class);
    public static final String TASK_TYPE = "STATS_BACKFILL";

    private final DbStatsService statsService;
    private final ObjectMapper objectMapper;

    public StatsBackfillTaskHandler(DbStatsService statsService, ObjectMapper objectMapper) {
        this.statsService = statsService;
        this.objectMapper = objectMapper;
    }

    @Override
    public String taskType() {
        return TASK_TYPE;
    }

    @Override
    public void handle(AsyncTaskEntity task) {
        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(task.getPayloadJson(), new TypeReference<>() {});
        } catch (Exception ex) {
            throw new RuntimeException("Invalid stats backfill payload", ex);
        }

        LocalDate yesterday = LocalDate.now().minusDays(1);
        String fromStr = (String) payload.getOrDefault("from", yesterday.toString());
        String toStr = (String) payload.getOrDefault("to", yesterday.toString());

        LocalDate from = "yesterday".equalsIgnoreCase(fromStr) ? yesterday : LocalDate.parse(fromStr);
        LocalDate to = "yesterday".equalsIgnoreCase(toStr) ? yesterday : LocalDate.parse(toStr);

        log.info("Stats backfill: from={}, to={}", from, to);
        statsService.backfillDailyStats(from, to);
        log.info("Stats backfill completed: from={}, to={}", from, to);
    }
}
