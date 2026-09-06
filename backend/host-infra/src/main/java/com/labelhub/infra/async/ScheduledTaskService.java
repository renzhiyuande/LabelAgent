package com.labelhub.infra.async;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.util.Jsons;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.SystemDtos.ScheduledTaskCreateCommand;
import com.labelhub.core.system.SystemDtos.ScheduledTaskDetail;
import com.labelhub.core.system.SystemDtos.ScheduledTaskSummary;
import com.labelhub.core.system.SystemDtos.ScheduledTaskUpdateCommand;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.ResourceQuerySpec;
import com.labelhub.infra.lowcode.query.spec.ScheduledTaskQuerySpec;
import com.labelhub.infra.persistence.entity.ScheduledTaskEntity;
import com.labelhub.infra.persistence.mapper.ScheduledTaskMapper;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ScheduledTaskService {
    private static final Logger log = LoggerFactory.getLogger(ScheduledTaskService.class);
    private static final ResourceQuerySpec<ScheduledTaskEntity> QUERY_SPEC = ScheduledTaskQuerySpec.build();

    private final ScheduledTaskMapper scheduledTaskMapper;
    private final AsyncTaskService asyncTaskService;
    private final MybatisQueryApplier queryApplier;
    private final ObjectMapper objectMapper;

    public ScheduledTaskService(ScheduledTaskMapper scheduledTaskMapper, AsyncTaskService asyncTaskService,
                                MybatisQueryApplier queryApplier, ObjectMapper objectMapper) {
        this.scheduledTaskMapper = scheduledTaskMapper;
        this.asyncTaskService = asyncTaskService;
        this.queryApplier = queryApplier;
        this.objectMapper = objectMapper;
    }

    @RequireAnyPermission({"system:admin"})
    public PageResponse<ScheduledTaskSummary> listScheduledTasks(ParsedListQuery query) {
        LambdaQueryWrapper<ScheduledTaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ScheduledTaskEntity::getDeletedFlag, 0);
        queryApplier.apply(wrapper, query, QUERY_SPEC);
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(ScheduledTaskEntity::getUpdatedAt);
        }
        IPage<ScheduledTaskEntity> page = scheduledTaskMapper.selectPage(
                new Page<>(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(page.getTotal(), query.page(), query.pageSize(),
                page.getRecords().stream().map(this::toSummary).toList());
    }

    @RequireAnyPermission({"system:admin"})
    public ScheduledTaskDetail getScheduledTask(Long id) {
        ScheduledTaskEntity entity = requireEntity(id);
        return new ScheduledTaskDetail(toSummary(entity), Jsons.readMapOrEmpty(entity.getPayloadJson()));
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "SCHEDULED_TASK", actionCode = "scheduledTask.create", entityId = "#result.id()")
    public ScheduledTaskSummary createScheduledTask(ScheduledTaskCreateCommand cmd) {
        return createScheduledTaskWithoutAuthorization(cmd);
    }

    /** Used by startup/bootstrap code where no request authentication exists yet. */
    @Transactional
    public ScheduledTaskSummary createScheduledTaskWithoutAuthorization(ScheduledTaskCreateCommand cmd) {
        validateCron(cmd.cronExpr());
        ScheduledTaskEntity entity = new ScheduledTaskEntity();
        entity.setTaskName(cmd.taskName());
        entity.setTaskType(cmd.taskType());
        entity.setCronExpr(cmd.cronExpr());
        entity.setPayloadJson(cmd.payloadJson() != null ? cmd.payloadJson() : "{}");
        entity.setBizType(cmd.bizType() != null ? cmd.bizType() : "");
        entity.setBizId(cmd.bizId() != null ? cmd.bizId() : 0L);
        entity.setPriority(cmd.priority() != null ? cmd.priority() : 5);
        entity.setMaxRetryCount(cmd.maxRetryCount() != null ? cmd.maxRetryCount() : 3);
        entity.setEnabled(cmd.enabled() != null && cmd.enabled() ? 1 : 0);
        entity.setTotalTriggerCount(0);
        entity.setDescription(cmd.description());
        entity.setNextTriggerAt(computeNextTrigger(cmd.cronExpr()));
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        scheduledTaskMapper.insert(entity);
        return toSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "SCHEDULED_TASK", actionCode = "scheduledTask.update", entityId = "#id")
    public ScheduledTaskSummary updateScheduledTask(Long id, ScheduledTaskUpdateCommand cmd) {
        ScheduledTaskEntity entity = requireEntity(id);
        if (cmd.taskName() != null) entity.setTaskName(cmd.taskName());
        if (cmd.taskType() != null) entity.setTaskType(cmd.taskType());
        if (cmd.cronExpr() != null) {
            validateCron(cmd.cronExpr());
            entity.setCronExpr(cmd.cronExpr());
            entity.setNextTriggerAt(computeNextTrigger(cmd.cronExpr()));
        }
        if (cmd.payloadJson() != null) entity.setPayloadJson(cmd.payloadJson());
        if (cmd.bizType() != null) entity.setBizType(cmd.bizType());
        if (cmd.bizId() != null) entity.setBizId(cmd.bizId());
        if (cmd.priority() != null) entity.setPriority(cmd.priority());
        if (cmd.maxRetryCount() != null) entity.setMaxRetryCount(cmd.maxRetryCount());
        if (cmd.enabled() != null) entity.setEnabled(cmd.enabled() ? 1 : 0);
        if (cmd.description() != null) entity.setDescription(cmd.description());
        entity.setUpdatedAt(Instant.now());
        scheduledTaskMapper.updateById(entity);
        return toSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "SCHEDULED_TASK", actionCode = "scheduledTask.enable", entityId = "#id")
    public ScheduledTaskSummary enableScheduledTask(Long id) {
        ScheduledTaskEntity entity = requireEntity(id);
        entity.setEnabled(1);
        entity.setNextTriggerAt(computeNextTrigger(entity.getCronExpr()));
        entity.setUpdatedAt(Instant.now());
        scheduledTaskMapper.updateById(entity);
        return toSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "SCHEDULED_TASK", actionCode = "scheduledTask.disable", entityId = "#id")
    public ScheduledTaskSummary disableScheduledTask(Long id) {
        ScheduledTaskEntity entity = requireEntity(id);
        entity.setEnabled(0);
        entity.setNextTriggerAt(null);
        entity.setUpdatedAt(Instant.now());
        scheduledTaskMapper.updateById(entity);
        return toSummary(entity);
    }

    @Transactional
    @RequireAnyPermission({"system:admin"})
    @Audit(entityType = "SCHEDULED_TASK", actionCode = "scheduledTask.triggerNow", entityId = "#id")
    public ScheduledTaskSummary triggerNow(Long id) {
        ScheduledTaskEntity entity = requireEntity(id);
        String bizKey = "cron:" + entity.getTaskName() + ":manual:" + System.currentTimeMillis();
        Map<String, Object> payload = Jsons.readMapOrEmpty(entity.getPayloadJson());
        asyncTaskService.enqueue(entity.getTaskType(),
                entity.getBizType() != null ? entity.getBizType() : "",
                entity.getBizId() != null ? entity.getBizId() : 0L,
                bizKey, entity.getPriority() != null ? entity.getPriority() : 5, payload);
        return toSummary(entity);
    }

    private ScheduledTaskEntity requireEntity(Long id) {
        ScheduledTaskEntity entity = scheduledTaskMapper.selectById(id);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Scheduled task not found");
        }
        return entity;
    }

    private void validateCron(String cronExpr) {
        try {
            CronExpression.parse(cronExpr);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid cron expression: " + ex.getMessage());
        }
    }

    Instant computeNextTrigger(String cronExpr) {
        try {
            CronExpression cron = CronExpression.parse(cronExpr);
            java.time.temporal.Temporal next = cron.next(java.time.LocalDateTime.now());
            if (next instanceof java.time.LocalDateTime ldt) {
                return ldt.atZone(java.time.ZoneId.systemDefault()).toInstant();
            }
            return Instant.now().plusSeconds(60);
        } catch (Exception ex) {
            return Instant.now().plusSeconds(60);
        }
    }

    ScheduledTaskSummary toSummary(ScheduledTaskEntity entity) {
        return new ScheduledTaskSummary(
                entity.getId(),
                entity.getTaskName(),
                entity.getTaskType(),
                entity.getCronExpr(),
                entity.getEnabled() != null ? entity.getEnabled() : 0,
                entity.getPriority() != null ? entity.getPriority() : 5,
                entity.getLastTriggeredAt(),
                entity.getNextTriggerAt(),
                entity.getTotalTriggerCount() != null ? entity.getTotalTriggerCount() : 0,
                entity.getDescription());
    }

}
