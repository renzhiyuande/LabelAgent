package com.labelhub.infra.claimtoken;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 库存对账兜底：周期性按 DB 真实状态重建活跃任务的 Redis 库存，
 * 校正 keyspace notification 丢失（hold 过期归还遗漏）导致的库存偏差。
 */
@Component
@ConditionalOnExpression("'${labelhub.auth.mode:db}' == 'db' && '${labelhub.claim-token.stock-reservation-enabled:true}' == 'true'")
public class ClaimTokenStockReconciler {
    private static final Logger log = LoggerFactory.getLogger(ClaimTokenStockReconciler.class);
    private static final String TASK_PUBLISHED = "PUBLISHED";

    private final TaskMapper taskMapper;
    private final ClaimTokenStockService claimTokenStockService;

    public ClaimTokenStockReconciler(TaskMapper taskMapper, ClaimTokenStockService claimTokenStockService) {
        this.taskMapper = taskMapper;
        this.claimTokenStockService = claimTokenStockService;
    }

    /** 默认每 5 分钟对账一次活跃任务库存 */
    @Scheduled(fixedDelayString = "${labelhub.claim-token.reconcile-interval-ms:300000}")
    public void reconcileActiveTasks() {
        if (!claimTokenStockService.isEnabled()) {
            return;
        }
        List<Long> taskIds = listPublishedTaskIds();
        int reconciled = 0;
        for (Long taskId : taskIds) {
            try {
                claimTokenStockService.syncStockFromDatabase(taskId);
                reconciled++;
            } catch (RuntimeException ex) {
                log.warn("Claim stock reconcile failed for task {}: {}", taskId, ex.getMessage());
            }
        }
        if (reconciled > 0) {
            log.debug("Claim stock reconciled for {} active tasks", reconciled);
        }
    }

    private List<Long> listPublishedTaskIds() {
        LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskEntity::getDeletedFlag, 0)
                .eq(TaskEntity::getStatus, TASK_PUBLISHED)
                .select(TaskEntity::getId);
        return taskMapper.selectList(wrapper).stream().map(TaskEntity::getId).toList();
    }
}
