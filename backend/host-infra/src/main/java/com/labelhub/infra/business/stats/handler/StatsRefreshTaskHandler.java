package com.labelhub.infra.business.stats.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.async.AsyncTaskHandler;
import com.labelhub.infra.business.stats.service.DbStatsService;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 任务统计快照刷新异步处理器。从 payload 或 bizId 解析 taskId，刷新 task_stats_snapshot。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class StatsRefreshTaskHandler implements AsyncTaskHandler {
    private static final Logger log = LoggerFactory.getLogger(StatsRefreshTaskHandler.class);
    public static final String TASK_TYPE = "STATS_REFRESH";

    private final DbStatsService statsService;
    private final ObjectMapper objectMapper;

    public StatsRefreshTaskHandler(DbStatsService statsService, ObjectMapper objectMapper) {
        this.statsService = statsService;
        this.objectMapper = objectMapper;
    }

    @Override
    public String taskType() {
        return TASK_TYPE;
    }

    @Override
    public void handle(AsyncTaskEntity task) {
        Long taskId = resolveTaskId(task);
        if (taskId == null || taskId <= 0) {
            throw new RuntimeException("Invalid stats refresh payload: missing taskId");
        }
        log.info("Stats refresh: taskId={}", taskId);
        statsService.refreshTaskStatsSnapshot(taskId);
        log.info("Stats refresh completed: taskId={}", taskId);
    }

    private Long resolveTaskId(AsyncTaskEntity task) {
        String payloadJson = task.getPayloadJson();
        if (payloadJson != null && !payloadJson.isBlank()) {
            try {
                Map<String, Object> payload = objectMapper.readValue(payloadJson, new TypeReference<>() {});
                Object taskIdValue = payload.get("taskId");
                if (taskIdValue instanceof Number number) {
                    return number.longValue();
                }
                if (taskIdValue instanceof String text && !text.isBlank()) {
                    return Long.parseLong(text);
                }
            } catch (Exception ex) {
                throw new RuntimeException("Invalid stats refresh payload", ex);
            }
        }
        if ("TASK".equalsIgnoreCase(task.getBizType()) && task.getBizId() != null && task.getBizId() > 0) {
            return task.getBizId();
        }
        return null;
    }
}
