package com.labelhub.infra.business.quota.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.core.business.BusinessDtos.QuotaReleaseBatchSummary;
import com.labelhub.core.business.BusinessDtos.QuotaReleaseCommand;
import com.labelhub.core.business.QuotaReleaseService;
import com.labelhub.core.business.distribute.DistributeStrategy;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.claimtoken.ClaimTokenStockService;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TaskQuotaReleaseBatchEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TaskQuotaReleaseBatchMapper;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbQuotaReleaseService implements QuotaReleaseService {
    private final TaskQuotaReleaseBatchMapper batchMapper;
    private final TaskMapper taskMapper;
    private final ClaimTokenStockService claimTokenStockService;
    private final CurrentUserContext currentUserContext;

    public DbQuotaReleaseService(TaskQuotaReleaseBatchMapper batchMapper, TaskMapper taskMapper,
            ClaimTokenStockService claimTokenStockService, CurrentUserContext currentUserContext) {
        this.batchMapper = batchMapper;
        this.taskMapper = taskMapper;
        this.claimTokenStockService = claimTokenStockService;
        this.currentUserContext = currentUserContext;
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    @Audit(entityType = "QUOTA_RELEASE", actionCode = "quota.release", entityId = "#result.id()", after = com.labelhub.core.audit.AuditSnapshotSource.RESULT)
    public QuotaReleaseBatchSummary releaseQuota(Long taskId, QuotaReleaseCommand command) {
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        if (!DistributeStrategy.QUOTA.equals(task.getDistributeStrategy())) {
            throw new BusinessException(ErrorCode.TASK_STRATEGY_NOT_QUOTA, "仅配额抢单（QUOTA）任务可放量");
        }

        long seq = batchMapper.selectCount(new LambdaQueryWrapper<TaskQuotaReleaseBatchEntity>()
                .eq(TaskQuotaReleaseBatchEntity::getTaskId, taskId)
                .eq(TaskQuotaReleaseBatchEntity::getDeletedFlag, 0)) + 1;

        TaskQuotaReleaseBatchEntity batch = new TaskQuotaReleaseBatchEntity();
        batch.setTaskId(taskId);
        batch.setBatchNo("QR-" + taskId + "-" + seq);
        batch.setReleaseCount(command.releaseCount());
        batch.setReleasedBy(currentUserContext.userIdOrZero());
        batch.setReleasedAt(Instant.now());
        batch.setStatus("ACTIVE");
        batch.setRemark(command.remark());
        batch.setCreatedAt(Instant.now());
        batch.setUpdatedAt(Instant.now());
        batchMapper.insert(batch);

        // Redis 库存累加（非覆盖）
        long remaining = claimTokenStockService.incrementStock(taskId, command.releaseCount());

        // 累计放量总额落 task.quota（看板展示）
        int prevQuota = task.getQuota() == null ? 0 : task.getQuota();
        task.setQuota(prevQuota + command.releaseCount());
        task.setUpdatedAt(Instant.now());
        taskMapper.updateById(task);

        return toSummary(batch, remaining);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public PageResponse<QuotaReleaseBatchSummary> listReleaseBatches(Long taskId, ParsedListQuery query) {
        LambdaQueryWrapper<TaskQuotaReleaseBatchEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskQuotaReleaseBatchEntity::getDeletedFlag, 0);
        if (taskId != null) {
            wrapper.eq(TaskQuotaReleaseBatchEntity::getTaskId, taskId);
        }
        wrapper.orderByDesc(TaskQuotaReleaseBatchEntity::getCreatedAt);
        IPage<TaskQuotaReleaseBatchEntity> pageResult = batchMapper.selectPage(
                new Page<>(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                pageResult.getRecords().stream().map(b -> toSummary(b, null)).toList());
    }

    private QuotaReleaseBatchSummary toSummary(TaskQuotaReleaseBatchEntity e, Long stockRemaining) {
        return new QuotaReleaseBatchSummary(e.getId(), e.getTaskId(), e.getBatchNo(), e.getReleaseCount(),
                e.getReleasedBy(), e.getReleasedAt(), e.getStatus(), e.getRemark(), stockRemaining);
    }
}
