package com.labelhub.infra.business.submission.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealBatchCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealBatchOperationSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealDecisionCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealDetail;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealSummary;
import com.labelhub.core.business.OwnerAppealService;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScope;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.business.submission.assembler.SubmissionAppealAssembler;
import com.labelhub.infra.business.submission.workflow.SubmissionAppealLifecycle;
import com.labelhub.infra.datapermission.DataPermissionRule;
import com.labelhub.infra.datapermission.DataScopeApplier;
import com.labelhub.infra.datapermission.DataScopeAspect;
import com.labelhub.infra.datapermission.DbDataPermissionService;
import com.labelhub.infra.datapermission.SqlPredicate;
import com.labelhub.infra.persistence.entity.AppealBatchOperationEntity;
import com.labelhub.infra.persistence.entity.SubmissionAppealEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.AppealBatchOperationMapper;
import com.labelhub.infra.persistence.mapper.SubmissionAppealMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.system.CurrentUserContext;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbOwnerAppealService implements OwnerAppealService {
    private final SubmissionAppealMapper submissionAppealMapper;
    private final AppealBatchOperationMapper appealBatchOperationMapper;
    private final TaskMapper taskMapper;
    private final SubmissionAppealLifecycle submissionAppealLifecycle;
    private final SubmissionAppealAssembler submissionAppealAssembler;
    private final CurrentUserContext currentUserContext;
    private final CurrentUserProvider currentUserProvider;
    private final DbDataPermissionService dataPermissionService;

    public DbOwnerAppealService(
            SubmissionAppealMapper submissionAppealMapper,
            AppealBatchOperationMapper appealBatchOperationMapper,
            TaskMapper taskMapper,
            SubmissionAppealLifecycle submissionAppealLifecycle,
            SubmissionAppealAssembler submissionAppealAssembler,
            CurrentUserContext currentUserContext,
            CurrentUserProvider currentUserProvider,
            DbDataPermissionService dataPermissionService) {
        this.submissionAppealMapper = submissionAppealMapper;
        this.appealBatchOperationMapper = appealBatchOperationMapper;
        this.taskMapper = taskMapper;
        this.submissionAppealLifecycle = submissionAppealLifecycle;
        this.submissionAppealAssembler = submissionAppealAssembler;
        this.currentUserContext = currentUserContext;
        this.currentUserProvider = currentUserProvider;
        this.dataPermissionService = dataPermissionService;
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    @DataScope(resource = DataResourceType.TASK)
    public PageResponse<SubmissionAppealSummary> listAppeals(ParsedListQuery query) {
        LambdaQueryWrapper<SubmissionAppealEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionAppealEntity::getDeletedFlag, 0)
                .orderByDesc(SubmissionAppealEntity::getCreatedAt);
        applyAppealTaskDataScope(wrapper);
        if (query.keyword() != null && !query.keyword().isBlank()) {
            String keyword = query.keyword().trim();
            wrapper.and(w -> w.like(SubmissionAppealEntity::getSubmissionId, keyword)
                    .or()
                    .like(SubmissionAppealEntity::getTaskId, keyword)
                    .or()
                    .like(SubmissionAppealEntity::getReasonText, keyword));
        }
        for (ParsedFilter filter : query.filters()) {
            if ("taskId".equals(filter.field()) && filter.value() != null) {
                wrapper.eq(SubmissionAppealEntity::getTaskId, Long.valueOf(String.valueOf(filter.value())));
            }
            if ("status".equals(filter.field()) && filter.value() != null) {
                wrapper.eq(SubmissionAppealEntity::getStatus, String.valueOf(filter.value()));
            }
        }
        IPage<SubmissionAppealEntity> page = submissionAppealMapper
                .selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        return PageResponse.of(
                page.getTotal(),
                query.page(),
                query.pageSize(),
                submissionAppealAssembler.assemble(page.getRecords()));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:task:read" })
    public SubmissionAppealDetail getAppeal(Long appealId) {
        return submissionAppealAssembler.assembleDetail(requireAccessibleAppeal(appealId));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    public SubmissionAppealSummary decideAppeal(Long appealId, SubmissionAppealDecisionCommand command) {
        SubmissionAppealEntity appeal = requireAccessibleAppeal(appealId);
        return submissionAppealAssembler.assemble(
                submissionAppealLifecycle.decideAppeal(appeal, command, currentUserContext.requireUserId(), null));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:task:update" })
    public SubmissionAppealBatchOperationSummary batchDecideAppeals(
            SubmissionAppealBatchCommand command,
            SubmissionAppealDecisionCommand decisionCommand) {
        List<Long> appealIds = command.ids().stream().distinct().toList();
        List<SubmissionAppealEntity> appeals = appealIds.stream().map(this::requireAccessibleAppeal).toList();
        String batchKey = "appeal-decide:" + UUID.randomUUID();
        AppealBatchOperationEntity operation = new AppealBatchOperationEntity();
        operation.setBatchKey(batchKey);
        operation.setTaskId(resolveSingleTaskId(appeals));
        operation.setOperatorId(currentUserContext.requireUserId());
        operation.setBatchAction("DECIDE_APPEAL_" + decisionCommand.decision());
        operation.setTargetTotalCount(appealIds.size());
        operation.setSuccessCount(0);
        operation.setFailedCount(0);
        operation.setStatus("RUNNING");
        operation.setStartedAt(Instant.now());
        operation.setCreatedAt(Instant.now());
        operation.setUpdatedAt(Instant.now());
        appealBatchOperationMapper.insert(operation);

        int success = 0;
        int failed = 0;
        Long operatorId = currentUserContext.requireUserId();
        for (Long appealId : appealIds) {
            try {
                submissionAppealLifecycle.decideAppeal(
                        requireAccessibleAppeal(appealId),
                        decisionCommand,
                        operatorId,
                        batchKey);
                success++;
            } catch (Exception ex) {
                failed++;
            }
        }
        operation.setSuccessCount(success);
        operation.setFailedCount(failed);
        operation.setStatus(failed == 0 ? "SUCCESS" : (success == 0 ? "FAILED" : "PARTIAL"));
        operation.setFinishedAt(Instant.now());
        operation.setUpdatedAt(Instant.now());
        appealBatchOperationMapper.updateById(operation);
        return submissionAppealAssembler.assembleBatch(appealBatchOperationMapper.selectById(operation.getId()));
    }

    private void applyAppealTaskDataScope(LambdaQueryWrapper<SubmissionAppealEntity> wrapper) {
        DataPermissionRule rule = DataScopeAspect.currentRule();
        if (rule == null || rule.predicates() == null || rule.predicates().isEmpty()) {
            wrapper.eq(SubmissionAppealEntity::getOwnerId, currentUserContext.requireUserId());
            return;
        }
        DataScopeApplier.applyTaskIdInSubquery(wrapper, rule.predicates());
    }

    private SubmissionAppealEntity requireAccessibleAppeal(Long appealId) {
        SubmissionAppealEntity entity = submissionAppealMapper.selectById(appealId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Appeal not found");
        }
        if (!canAccessAppeal(entity)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
        return entity;
    }

    private boolean canAccessAppeal(SubmissionAppealEntity entity) {
        Long userId = currentUserContext.requireUserId();
        if (userId.equals(entity.getOwnerId())) {
            return true;
        }
        AuthenticatedUser user = currentUserProvider.currentUser();
        DataPermissionRule rule = dataPermissionService.buildRule(user.roles(), DataResourceType.TASK, userId);
        List<SqlPredicate> predicates = rule.predicates();
        if (predicates == null || predicates.isEmpty()) {
            return false;
        }
        if (DataScopeApplier.grantsAll(predicates)) {
            return true;
        }
        LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskEntity::getDeletedFlag, 0)
                .eq(TaskEntity::getId, entity.getTaskId());
        DataScopeApplier.applyPredicates(wrapper, predicates);
        Long count = taskMapper.selectCount(wrapper);
        return count != null && count > 0;
    }

    private Long resolveSingleTaskId(List<SubmissionAppealEntity> appeals) {
        Set<Long> taskIds = appeals.stream().map(SubmissionAppealEntity::getTaskId).collect(Collectors.toSet());
        return taskIds.size() == 1 ? taskIds.iterator().next() : null;
    }
}
