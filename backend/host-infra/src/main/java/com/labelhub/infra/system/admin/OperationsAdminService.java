package com.labelhub.infra.system.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.system.SystemDtos.AsyncTaskDetail;
import com.labelhub.core.system.SystemDtos.AsyncTaskSummary;
import com.labelhub.core.system.SystemDtos.AuditLogSummary;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.domain.model.Status;
import com.labelhub.infra.persistence.entity.AsyncTaskEntity;
import com.labelhub.infra.persistence.entity.AuditLogEntity;
import com.labelhub.infra.persistence.mapper.AsyncTaskMapper;
import com.labelhub.infra.persistence.mapper.AuditLogMapper;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.AsyncTaskQuerySpec;
import com.labelhub.infra.lowcode.query.spec.AuditLogQuerySpec;
import com.labelhub.infra.system.admin.mapper.OperationsAdminMapper;
import com.labelhub.infra.util.Jsons;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OperationsAdminService {
    private static final ResourceQuerySpec<AuditLogEntity> AUDIT_QUERY_SPEC = AuditLogQuerySpec.build();
    private static final ResourceQuerySpec<AsyncTaskEntity> TASK_QUERY_SPEC = AsyncTaskQuerySpec.build();

    private final AuditLogMapper auditLogMapper;
    private final AsyncTaskMapper asyncTaskMapper;
    private final AdminSupport adminSupport;
    private final MybatisQueryApplier queryApplier;
    private final OperationsAdminMapper operationsAdminMapper;

    public OperationsAdminService(
            AuditLogMapper auditLogMapper,
            AsyncTaskMapper asyncTaskMapper,
            AdminSupport adminSupport,
            MybatisQueryApplier queryApplier,
            OperationsAdminMapper operationsAdminMapper) {
        this.auditLogMapper = auditLogMapper;
        this.asyncTaskMapper = asyncTaskMapper;
        this.adminSupport = adminSupport;
        this.queryApplier = queryApplier;
        this.operationsAdminMapper = operationsAdminMapper;
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<AuditLogSummary> listAuditLogs(PageQuery query, String entityType, String actionCode,
                                                       Long operatorId, String traceId) {
        LambdaQueryWrapper<AuditLogEntity> wrapper = new LambdaQueryWrapper<AuditLogEntity>()
                .eq(AuditLogEntity::getDeletedFlag, 0)
                .orderByDesc(AuditLogEntity::getOccurredAt, AuditLogEntity::getId);
        if (entityType != null && !entityType.isBlank()) {
            wrapper.eq(AuditLogEntity::getEntityType, entityType);
        }
        if (actionCode != null && !actionCode.isBlank()) {
            wrapper.eq(AuditLogEntity::getActionCode, actionCode);
        }
        if (operatorId != null) {
            wrapper.eq(AuditLogEntity::getOperatorId, operatorId);
        }
        if (traceId != null && !traceId.isBlank()) {
            wrapper.eq(AuditLogEntity::getTraceId, traceId);
        }
        var page = auditLogMapper.selectPage(adminSupport.page(query), wrapper);
        return PageResponse.of(page.getTotal(), query.normalizedPage(), query.normalizedPageSize(),
                page.getRecords().stream().map(this::toAuditLogSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<AsyncTaskSummary> listAsyncTasks(PageQuery query, String status) {
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<AsyncTaskEntity>()
                .eq(AsyncTaskEntity::getDeletedFlag, 0)
                .orderByDesc(AsyncTaskEntity::getUpdatedAt, AsyncTaskEntity::getId);
        if (status != null && !status.isBlank()) {
            wrapper.eq(AsyncTaskEntity::getStatus, status);
        }
        var page = asyncTaskMapper.selectPage(adminSupport.page(query), wrapper);
        return PageResponse.of(page.getTotal(), query.normalizedPage(), query.normalizedPageSize(),
                page.getRecords().stream().map(this::toAsyncTaskSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<AuditLogSummary> listAuditLogs(ParsedListQuery query) {
        LambdaQueryWrapper<AuditLogEntity> wrapper = new LambdaQueryWrapper<AuditLogEntity>()
                .eq(AuditLogEntity::getDeletedFlag, 0);
        queryApplier.apply(wrapper, query, AUDIT_QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(AuditLogEntity::getOccurredAt, AuditLogEntity::getId);
        }
        var page = auditLogMapper.selectPage(adminSupport.page(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(page.getTotal(), query.page(), query.pageSize(),
                page.getRecords().stream().map(this::toAuditLogSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<AsyncTaskSummary> listAsyncTasks(ParsedListQuery query) {
        LambdaQueryWrapper<AsyncTaskEntity> wrapper = new LambdaQueryWrapper<AsyncTaskEntity>()
                .eq(AsyncTaskEntity::getDeletedFlag, 0);
        queryApplier.apply(wrapper, query, TASK_QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(AsyncTaskEntity::getUpdatedAt, AsyncTaskEntity::getId);
        }
        var page = asyncTaskMapper.selectPage(adminSupport.page(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(page.getTotal(), query.page(), query.pageSize(),
                page.getRecords().stream().map(this::toAsyncTaskSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public AuditLogSummary getAuditLog(Long id) {
        AuditLogEntity entity = adminSupport.requireEntity(auditLogMapper.selectById(id), "audit log");
        return toAuditLogSummary(entity);
    }

    @RequireAnyPermission({"system:admin"})
    public AsyncTaskDetail getAsyncTask(Long id) {
        AsyncTaskEntity entity = adminSupport.requireEntity(asyncTaskMapper.selectById(id), "async task");
        return new AsyncTaskDetail(toAsyncTaskSummary(entity), Jsons.readMap(entity.getPayloadJson()));
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "ASYNC_TASK", actionCode = "asyncTask.retry", entityId = "#id")
    public AsyncTaskSummary retryAsyncTask(Long id) {
        AsyncTaskEntity entity = adminSupport.requireEntity(asyncTaskMapper.selectById(id), "async task");
        if (!Status.FAILED.equals(entity.getStatus()) && !Status.DEAD_LETTER.equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Only FAILED or DEAD_LETTER tasks can be retried");
        }
        entity.setStatus(Status.PENDING);
        entity.setManualRetryCount(entity.getManualRetryCount() == null ? 1 : entity.getManualRetryCount() + 1);
        entity.setWorkerId(null);
        entity.setLockedAt(null);
        entity.setStartedAt(null);
        entity.setFinishedAt(null);
        entity.setCanceledAt(null);
        entity.setDeadLetteredAt(null);
        entity.setLastErrorCode(null);
        entity.setLastErrorMessage(null);
        entity.setNextRunAt(Instant.now());
        asyncTaskMapper.updateById(entity);
        return toAsyncTaskSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "ASYNC_TASK", actionCode = "asyncTask.cancel", entityId = "#id")
    public AsyncTaskSummary cancelAsyncTask(Long id) {
        AsyncTaskEntity entity = adminSupport.requireEntity(asyncTaskMapper.selectById(id), "async task");
        if (!Status.PENDING.equals(entity.getStatus()) && !"RUNNING".equals(entity.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Only PENDING or RUNNING tasks can be canceled");
        }
        entity.setStatus("CANCELED");
        entity.setCanceledAt(Instant.now());
        asyncTaskMapper.updateById(entity);
        return toAsyncTaskSummary(entity);
    }

    public AuditLogSummary toAuditLogSummary(AuditLogEntity entity) {
        return operationsAdminMapper.toAuditLogSummary(entity);
    }

    public AsyncTaskSummary toAsyncTaskSummary(AsyncTaskEntity entity) {
        return operationsAdminMapper.toAsyncTaskSummary(entity);
    }
}
