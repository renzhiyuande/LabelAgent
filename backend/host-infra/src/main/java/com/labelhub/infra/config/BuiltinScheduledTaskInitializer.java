package com.labelhub.infra.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.system.SystemDtos.ScheduledTaskCreateCommand;
import com.labelhub.infra.async.ScheduledTaskService;
import com.labelhub.infra.business.review.handler.AiReviewPromptHealthTaskHandler;
import com.labelhub.infra.business.stats.handler.StatsBackfillTaskHandler;
import com.labelhub.infra.persistence.entity.ScheduledTaskEntity;
import com.labelhub.infra.persistence.mapper.ScheduledTaskMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 应用启动时自动注册内置定时任务（如统计回填）。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class BuiltinScheduledTaskInitializer implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(BuiltinScheduledTaskInitializer.class);

    private final ScheduledTaskMapper scheduledTaskMapper;
    private final ScheduledTaskService scheduledTaskService;

    public BuiltinScheduledTaskInitializer(ScheduledTaskMapper scheduledTaskMapper,
            ScheduledTaskService scheduledTaskService) {
        this.scheduledTaskMapper = scheduledTaskMapper;
        this.scheduledTaskService = scheduledTaskService;
    }

    @Override
    public void run(String... args) {
        ensureStatsBackfillTask();
        ensureAiReviewPromptHealthTask();
    }

    private void ensureStatsBackfillTask() {
        String taskName = "stats-daily-backfill";
        LambdaQueryWrapper<ScheduledTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ScheduledTaskEntity::getTaskName, taskName)
                .eq(ScheduledTaskEntity::getDeletedFlag, 0)
                .last("LIMIT 1");
        ScheduledTaskEntity existing = scheduledTaskMapper.selectOne(wrapper);
        if (existing != null) {
            log.info("Scheduled task '{}' already exists, skip registration", taskName);
            return;
        }

        ScheduledTaskCreateCommand cmd = new ScheduledTaskCreateCommand(
                taskName,
                StatsBackfillTaskHandler.TASK_TYPE,
                "0 7 1 * * *", // 每天凌晨 1:07（避开整点高峰）
                "{\"from\":\"yesterday\",\"to\":\"yesterday\"}",
                "STATS_BACKFILL",
                0L,
                5,
                3,
                true,
                "每日凌晨自动回填前一天的任务与用户统计数据");
        scheduledTaskService.createScheduledTaskWithoutAuthorization(cmd);
        log.info("Registered builtin scheduled task: {}", taskName);
    }

    private void ensureAiReviewPromptHealthTask() {
        String taskName = "ai-review-prompt-health-daily";
        LambdaQueryWrapper<ScheduledTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ScheduledTaskEntity::getTaskName, taskName)
                .eq(ScheduledTaskEntity::getDeletedFlag, 0)
                .last("LIMIT 1");
        ScheduledTaskEntity existing = scheduledTaskMapper.selectOne(wrapper);
        if (existing != null) {
            log.info("Scheduled task '{}' already exists, skip registration", taskName);
            return;
        }

        ScheduledTaskCreateCommand cmd = new ScheduledTaskCreateCommand(
                taskName,
                AiReviewPromptHealthTaskHandler.TASK_TYPE,
                "0 15 2 * * *",
                "{\"metricDate\":\"yesterday\"}",
                "AI_REVIEW_PROMPT_HEALTH",
                0L,
                5,
                3,
                true,
                "每日凌晨自动聚合 AI 预审健康指标并抽取误判样本");
        scheduledTaskService.createScheduledTaskWithoutAuthorization(cmd);
        log.info("Registered builtin scheduled task: {}", taskName);
    }
}
