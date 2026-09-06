package com.labelhub.infra.async;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.util.Jsons;
import com.labelhub.infra.persistence.entity.ScheduledTaskEntity;
import com.labelhub.infra.persistence.mapper.ScheduledTaskMapper;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class CronSchedulerWorker {
    private static final Logger log = LoggerFactory.getLogger(CronSchedulerWorker.class);

    private final ScheduledTaskMapper scheduledTaskMapper;
    private final ScheduledTaskService scheduledTaskService;
    private final AsyncTaskService asyncTaskService;
    private final ObjectMapper objectMapper;

    public CronSchedulerWorker(ScheduledTaskMapper scheduledTaskMapper,
                                ScheduledTaskService scheduledTaskService,
                                AsyncTaskService asyncTaskService,
                                ObjectMapper objectMapper) {
        this.scheduledTaskMapper = scheduledTaskMapper;
        this.scheduledTaskService = scheduledTaskService;
        this.asyncTaskService = asyncTaskService;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${labelhub.async.cron-check-interval-ms:30000}")
    public void checkAndTrigger() {
        LambdaQueryWrapper<ScheduledTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ScheduledTaskEntity::getDeletedFlag, 0)
                .eq(ScheduledTaskEntity::getEnabled, 1)
                .le(ScheduledTaskEntity::getNextTriggerAt, Instant.now());
        List<ScheduledTaskEntity> due = scheduledTaskMapper.selectList(wrapper);
        for (ScheduledTaskEntity task : due) {
            try {
                trigger(task);
            } catch (Exception ex) {
                log.warn("Failed to trigger scheduled task {}: {}", task.getTaskName(), ex.getMessage());
            }
        }
    }

    private void trigger(ScheduledTaskEntity task) {
        int seq = (task.getTotalTriggerCount() != null ? task.getTotalTriggerCount() : 0) + 1;
        String bizKey = "cron:" + task.getTaskName() + ":" + seq;
        Map<String, Object> payload = Jsons.readMapOrEmpty(task.getPayloadJson());
        asyncTaskService.enqueue(task.getTaskType(),
                task.getBizType() != null ? task.getBizType() : "",
                task.getBizId() != null ? task.getBizId() : 0L,
                bizKey, task.getPriority() != null ? task.getPriority() : 5, payload);
        task.setLastTriggeredAt(Instant.now());
        task.setTotalTriggerCount(seq);
        task.setNextTriggerAt(scheduledTaskService.computeNextTrigger(task.getCronExpr()));
        task.setUpdatedAt(Instant.now());
        scheduledTaskMapper.updateById(task);
        log.info("Triggered scheduled task '{}' (seq={})", task.getTaskName(), seq);
    }


}
