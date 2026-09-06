package com.labelhub.infra.business.assignment.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.audit.Audit;
import com.labelhub.core.audit.AuditSnapshotSource;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.infra.system.CurrentUserContext;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.business.AssignmentService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.infra.business.display.assembler.AssignmentSummaryAssembler;
import com.labelhub.infra.business.assignment.workflow.AssignmentStateMachineService;
import com.labelhub.infra.business.submission.support.SubmissionCurrentSupport;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.lowcode.query.spec.AssignmentQuerySpec;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.statemachine.AssignmentStatus;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbAssignmentService implements AssignmentService {
    private final AssignmentMapper assignmentMapper;
    private final SubmissionCurrentSupport submissionCurrentSupport;
    private final TaskItemMapper taskItemMapper;
    private final AssignmentStateMachineService stateMachineService;
    private final CurrentUserContext currentUserContext;
    private final ObjectMapper objectMapper;
    private final MybatisQueryApplier queryApplier;
    private final AssignmentSummaryAssembler summaryAssembler;

    public DbAssignmentService(
            AssignmentMapper assignmentMapper,
            SubmissionCurrentSupport submissionCurrentSupport,
            TaskItemMapper taskItemMapper,
            AssignmentStateMachineService stateMachineService,
            CurrentUserContext currentUserContext,
            ObjectMapper objectMapper,
            MybatisQueryApplier queryApplier,
            AssignmentSummaryAssembler summaryAssembler) {
        this.assignmentMapper = assignmentMapper;
        this.submissionCurrentSupport = submissionCurrentSupport;
        this.taskItemMapper = taskItemMapper;
        this.stateMachineService = stateMachineService;
        this.currentUserContext = currentUserContext;
        this.objectMapper = objectMapper;
        this.queryApplier = queryApplier;
        this.summaryAssembler = summaryAssembler;
    }

    private AssignmentSummary toSummary(AssignmentEntity entity) {
        return summaryAssembler.assemble(entity);
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:assignment:read" })
    public PageResponse<AssignmentSummary> listAssignments(ParsedListQuery query) {
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0);
        queryApplier.apply(wrapper, query, AssignmentQuerySpec.build());
        if (query.sort().isEmpty()) {
            wrapper.orderByDesc(AssignmentEntity::getCreatedAt);
        }
        IPage<AssignmentEntity> pageResult = assignmentMapper.selectPage(new Page<>(query.page(), query.pageSize()),
                wrapper);
        return PageResponse.of(pageResult.getTotal(), query.page(), query.pageSize(),
                summaryAssembler.assemble(pageResult.getRecords()));
    }

    @Override
    @RequireAnyPermission({ "system:admin", "business:assignment:read" })
    public AssignmentDetail getAssignmentDetail(Long assignmentId) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        return summaryAssembler.assembleDetail(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:create" })
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.create", entityId = "#result.id()", after = AuditSnapshotSource.RESULT)
    public AssignmentSummary createAssignment(AssignmentCreateCommand command) {
        int slotNo = command.slotNo() != null ? command.slotNo() : 1;
        requireTaskItemBelongsToTask(command.taskId(), command.itemId());
        Instant now = Instant.now();
        AssignmentEntity reusable = findReassignableAssignment(command.taskId(), command.itemId(), slotNo);
        if (reusable != null) {
            reusable.setLabelerId(command.labelerId());
            reusable.setAssignType(command.assignType() != null ? command.assignType() : "AUTO_CLAIM");
            reusable.setClaimSource("MANUAL");
            reusable.setStatus(command.labelerId() != null && command.labelerId() > 0
                    ? AssignmentStatus.CLAIMED.name()
                    : AssignmentStatus.UNCLAIMED.name());
            reusable.setAssignedBy(currentUserContext.userIdOrZero());
            reusable.setAssignedAt(now);
            reusable.setClaimedAt(command.labelerId() != null && command.labelerId() > 0 ? now : null);
            reusable.setDeadlineAt(command.deadlineAt());
            reusable.setUpdatedAt(now);
            assignmentMapper.updateById(reusable);
            if (command.labelerId() != null && command.labelerId() > 0) {
                submissionCurrentSupport.realignCurrentSubmissionOnLabelerChange(reusable.getId(), command.labelerId());
            }
            return toSummary(reusable);
        }
        requireAssignableItemSlot(command.itemId(), slotNo);
        AssignmentEntity entity = new AssignmentEntity();
        entity.setTaskId(command.taskId());
        entity.setItemId(command.itemId());
        entity.setSlotNo(slotNo);
        entity.setLabelerId(command.labelerId());
        entity.setAssignType(command.assignType() != null ? command.assignType() : "AUTO_CLAIM");
        entity.setClaimSource("MANUAL");
        entity.setStatus(AssignmentStatus.UNCLAIMED.name());
        entity.setCurrentRoundNo(1);
        entity.setAssignedBy(currentUserContext.userIdOrZero());
        entity.setAssignedAt(now);
        entity.setDeadlineAt(command.deadlineAt());
        assignmentMapper.insert(entity);
        return toSummary(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:update" })
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.reassign", entityId = "#assignmentId", after = AuditSnapshotSource.RESULT)
    public AssignmentSummary updateAssignment(Long assignmentId, AssignmentUpdateCommand command) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        String status = entity.getStatus();
        if (!AssignmentStatus.UNCLAIMED.name().equals(status)
                && !AssignmentStatus.CLAIMED.name().equals(status)) {
            throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED,
                    "Assignment cannot be reconfigured in status " + status);
        }
        Instant now = Instant.now();
        if (command.labelerId() != null) {
            long labelerId = command.labelerId();
            if (labelerId > 0) {
                entity.setLabelerId(labelerId);
                if (AssignmentStatus.UNCLAIMED.name().equals(status)) {
                    entity.setStatus(AssignmentStatus.CLAIMED.name());
                    entity.setClaimedAt(now);
                }
            } else {
                entity.setLabelerId(null);
                entity.setClaimedAt(null);
                entity.setStatus(AssignmentStatus.UNCLAIMED.name());
            }
        }
        entity.setDeadlineAt(command.deadlineAt());
        entity.setAssignedBy(currentUserContext.userIdOrZero());
        entity.setAssignedAt(now);
        entity.setUpdatedAt(now);
        assignmentMapper.updateById(entity);
        if (command.labelerId() != null && command.labelerId() > 0) {
            submissionCurrentSupport.realignCurrentSubmissionOnLabelerChange(assignmentId, command.labelerId());
        }
        return toSummary(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:create" })
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.batch_create", entityId = "#result[0].id()", after = AuditSnapshotSource.RESULT)
    public List<AssignmentSummary> batchCreateAssignments(AssignmentsBatchCreateCommand command) {
        List<Long> itemIds = command.itemIds().stream().distinct().toList();
        if (itemIds.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "itemIds must not be empty");
        }
        return itemIds.stream().map(itemId -> {
            requireTaskItemBelongsToTask(command.taskId(), itemId);
            AssignmentEntity reusable = findReassignableAssignment(command.taskId(), itemId, 1);
            if (reusable != null) {
                reusable.setLabelerId(command.labelerId());
                reusable.setAssignType("MANUAL_ASSIGN");
                reusable.setClaimSource("MANUAL");
                reusable.setStatus(AssignmentStatus.CLAIMED.name());
                reusable.setAssignedBy(currentUserContext.userIdOrZero());
                Instant now = Instant.now();
                reusable.setAssignedAt(now);
                reusable.setClaimedAt(now);
                reusable.setDeadlineAt(command.deadlineAt());
                reusable.setUpdatedAt(now);
                assignmentMapper.updateById(reusable);
                submissionCurrentSupport.realignCurrentSubmissionOnLabelerChange(reusable.getId(), command.labelerId());
                return toSummary(reusable);
            }
            requireAssignableItemSlot(itemId, 1);
            AssignmentEntity entity = new AssignmentEntity();
            entity.setTaskId(command.taskId());
            entity.setItemId(itemId);
            entity.setSlotNo(1);
            entity.setLabelerId(command.labelerId());
            entity.setAssignType("MANUAL_ASSIGN");
            entity.setClaimSource("MANUAL");
            applyManualAssignStatus(entity, command.labelerId());
            entity.setCurrentRoundNo(1);
            entity.setAssignedBy(currentUserContext.userIdOrZero());
            entity.setAssignedAt(Instant.now());
            entity.setDeadlineAt(command.deadlineAt());
            assignmentMapper.insert(entity);
            return toSummary(entity);
        }).toList();
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:update" })
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.batch_cancel", entityId = "#result[0].id()", after = AuditSnapshotSource.RESULT)
    public List<AssignmentSummary> batchCancelAssignments(AssignmentsBatchCancelCommand command) {
        List<Long> itemIds = command.itemIds().stream().distinct().toList();
        if (itemIds.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "itemIds must not be empty");
        }
        return batchCancelByTaskAndItemIds(command.taskId(), itemIds, command.reason());
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:update" })
    public void batchCancelAssignmentsByItemIds(List<Long> itemIds, String reason) {
        if (itemIds == null || itemIds.isEmpty()) {
            return;
        }
        List<Long> distinctItemIds = itemIds.stream().distinct().toList();
        Long taskId = requireTaskIdForItems(distinctItemIds);
        batchCancelByTaskAndItemIds(taskId, distinctItemIds, reason);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:update" })
    public void batchReopenAssignmentsByItemIds(List<Long> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            return;
        }
        List<Long> distinctItemIds = itemIds.stream().distinct().toList();
        Long taskId = requireTaskIdForItems(distinctItemIds);
        distinctItemIds.forEach(itemId -> {
            Long assignmentId = requireCancelledAssignmentId(taskId, itemId);
            reopenAssignment(assignmentId);
        });
    }

    private List<AssignmentSummary> batchCancelByTaskAndItemIds(Long taskId, List<Long> itemIds, String reason) {
        String resolvedReason = reason != null ? reason : "";
        List<Long> cancelledAssignmentIds = new ArrayList<>();
        itemIds.forEach(itemId -> {
            Long assignmentId = requireCancellableAssignmentId(taskId, itemId);
            cancelAssignment(assignmentId, resolvedReason);
            cancelledAssignmentIds.add(assignmentId);
        });
        return cancelledAssignmentIds.stream()
                .map(assignmentMapper::selectById)
                .map(this::toSummary)
                .toList();
    }

    private Long requireTaskIdForItems(List<Long> itemIds) {
        TaskItemEntity first = taskItemMapper.selectById(itemIds.get(0));
        if (first == null || first.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Task item not found: " + itemIds.get(0));
        }
        Long taskId = first.getTaskId();
        for (Long itemId : itemIds) {
            if (itemId.equals(first.getId())) {
                continue;
            }
            TaskItemEntity item = taskItemMapper.selectById(itemId);
            if (item == null || item.getDeletedFlag() == 1) {
                throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Task item not found: " + itemId);
            }
            if (!taskId.equals(item.getTaskId())) {
                throw new BusinessException(
                        ErrorCode.VALIDATION_ERROR, "All task items must belong to the same task");
            }
        }
        return taskId;
    }

    @Override
    @Transactional
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.claim", entityId = "#assignmentId")
    public AssignmentSummary claimAssignment(Long assignmentId) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        AssignmentStatus next = stateMachineService.transition(assignmentId, AssignmentEvent.CLAIM);
        entity.setStatus(next.name());
        entity.setLabelerId(currentUserContext.userIdOrZero());
        entity.setClaimedAt(Instant.now());
        assignmentMapper.updateById(entity);
        return toSummary(entity);
    }

    @Override
    @Transactional
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.save_draft", entityId = "#assignmentId")
    public AssignmentSummary saveDraft(Long assignmentId, Map<String, Object> draftData) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        stateMachineService.transition(assignmentId, AssignmentEvent.SAVE_DRAFT);
        try {
            String extJson = objectMapper.writeValueAsString(draftData);
            entity.setExtJson(extJson);
        } catch (Exception e) {
            entity.setExtJson(null);
        }
        assignmentMapper.updateById(entity);
        return toSummary(entity);
    }

    @Override
    @Transactional
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.submit", entityId = "#assignmentId")
    public AssignmentSummary submitAssignment(Long assignmentId) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        AssignmentStatus next = stateMachineService.transition(assignmentId, AssignmentEvent.SUBMIT);
        entity.setStatus(next.name());
        entity.setClosedAt(Instant.now());
        assignmentMapper.updateById(entity);
        return toSummary(entity);
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:update" })
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.reopen", entityId = "#assignmentId")
    public AssignmentSummary reopenAssignment(Long assignmentId) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        AssignmentStatus current = AssignmentStatus.valueOf(entity.getStatus());
        if (current != AssignmentStatus.EXPIRED && current != AssignmentStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED,
                    "Only expired or cancelled assignments can be reopened; "
                            + "for submitted work use labeler withdraw or review return");
        }
        if (!stateMachineService.canTransition(assignmentId, AssignmentEvent.REOPEN)) {
            throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED,
                    "Assignment cannot be reopened in status " + current.name());
        }
        AssignmentStatus next = stateMachineService.transition(assignmentId, AssignmentEvent.REOPEN);
        assignmentMapper.update(null, new LambdaUpdateWrapper<AssignmentEntity>()
                .eq(AssignmentEntity::getId, assignmentId)
                .set(AssignmentEntity::getStatus, next.name())
                .set(AssignmentEntity::getRevokedAt, Instant.now())
                .set(AssignmentEntity::getLabelerId, null)
                .set(AssignmentEntity::getClaimedAt, null)
                .set(AssignmentEntity::getClosedAt, null)
                .set(AssignmentEntity::getCanceledAt, null)
                .set(AssignmentEntity::getCancelReason, null));
        return toSummary(assignmentMapper.selectById(assignmentId));
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "system:admin", "business:assignment:update" })
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.cancel", entityId = "#assignmentId")
    public void cancelAssignment(Long assignmentId, String reason) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        stateMachineService.transition(assignmentId, AssignmentEvent.CANCEL);
        assignmentMapper.update(null, new LambdaUpdateWrapper<AssignmentEntity>()
                .eq(AssignmentEntity::getId, assignmentId)
                .set(AssignmentEntity::getCanceledAt, Instant.now())
                .set(AssignmentEntity::getCancelReason, reason));
    }

    /**
     * 与 uk_assignments_item_slot(tenant_id, item_id, slot_no, deleted_flag) 一致：
     * 只要存在未软删的 assignment 行（含 CANCELLED），即不可再占同一 slot。
     */
    private Long requireCancellableAssignmentId(Long taskId, Long itemId) {
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getTaskId, taskId)
                .eq(AssignmentEntity::getItemId, itemId)
                .ne(AssignmentEntity::getStatus, AssignmentStatus.CANCELLED.name())
                .orderByDesc(AssignmentEntity::getId)
                .last("LIMIT 1");
        AssignmentEntity entity = assignmentMapper.selectOne(wrapper);
        if (entity == null) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND,
                    "No active assignment for item: " + itemId);
        }
        String status = entity.getStatus();
        if (!AssignmentStatus.UNCLAIMED.name().equals(status)
                && !AssignmentStatus.CLAIMED.name().equals(status)) {
            throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED,
                    "Assignment cannot be cancelled in status " + status + " for item: " + itemId);
        }
        return entity.getId();
    }

    private AssignmentEntity findReassignableAssignment(Long taskId, Long itemId, int slotNo) {
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getTaskId, taskId)
                .eq(AssignmentEntity::getItemId, itemId)
                .eq(AssignmentEntity::getSlotNo, slotNo)
                .eq(AssignmentEntity::getStatus, AssignmentStatus.UNCLAIMED.name())
                .isNotNull(AssignmentEntity::getRevokedAt)
                .orderByDesc(AssignmentEntity::getId)
                .last("LIMIT 1");
        return assignmentMapper.selectOne(wrapper);
    }

    private Long requireCancelledAssignmentId(Long taskId, Long itemId) {
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getTaskId, taskId)
                .eq(AssignmentEntity::getItemId, itemId)
                .eq(AssignmentEntity::getStatus, AssignmentStatus.CANCELLED.name())
                .orderByDesc(AssignmentEntity::getId)
                .last("LIMIT 1");
        AssignmentEntity entity = assignmentMapper.selectOne(wrapper);
        if (entity == null) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND,
                    "No cancelled assignment for item: " + itemId);
        }
        return entity.getId();
    }

    private void requireTaskItemBelongsToTask(Long taskId, Long itemId) {
        TaskItemEntity item = taskItemMapper.selectById(itemId);
        if (item == null || item.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Task item not found: " + itemId);
        }
        if (!taskId.equals(item.getTaskId())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Task item does not belong to task " + taskId + ": " + itemId);
        }
    }

    /**
     * 与 uk_assignments_item_slot(tenant_id, item_id, slot_no, deleted_flag) 一致。
     */
    private void requireAssignableItemSlot(Long itemId, int slotNo) {
        LambdaQueryWrapper<AssignmentEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AssignmentEntity::getDeletedFlag, 0)
                .eq(AssignmentEntity::getItemId, itemId)
                .eq(AssignmentEntity::getSlotNo, slotNo);
        Long count = assignmentMapper.selectCount(wrapper);
        if (count != null && count > 0) {
            throw new BusinessException(ErrorCode.OPERATION_NOT_ALLOWED,
                    "Task item already has an assignment: " + itemId);
        }
    }

    /** 手动指派且指定标注员时，直接视为已认领，避免停留在 UNCLAIMED。 */
    private void applyManualAssignStatus(AssignmentEntity entity, Long labelerId) {
        if (labelerId != null && labelerId > 0) {
            entity.setStatus(AssignmentStatus.CLAIMED.name());
            entity.setClaimedAt(Instant.now());
            return;
        }
        entity.setStatus(AssignmentStatus.UNCLAIMED.name());
    }
}
