package com.labelhub.infra.business.display.assembler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.business.BusinessDtos.SubmissionRecordSubmitHistory;
import com.labelhub.core.business.BusinessDtos.SubmissionTimelineEntry;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.AuditLogEntity;
import com.labelhub.infra.persistence.entity.SubmissionAppealEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.SubmissionStatusHistoryEntity;
import com.labelhub.infra.persistence.entity.SubmissionVersionEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.mapper.AuditLogMapper;
import com.labelhub.infra.persistence.mapper.SubmissionAppealMapper;
import com.labelhub.infra.persistence.mapper.SubmissionStatusHistoryMapper;
import com.labelhub.infra.persistence.mapper.SubmissionVersionMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionTimelineAssembler {
    private static final Set<String> SKIPPED_AUDIT_ACTIONS = Set.of("submission.transition", "assignment.transition");

    private final SubmissionVersionMapper submissionVersionMapper;
    private final SubmissionStatusHistoryMapper submissionStatusHistoryMapper;
    private final SubmissionAppealMapper submissionAppealMapper;
    private final AuditLogMapper auditLogMapper;
    private final UserDisplayNameResolver userDisplayNameResolver;

    public SubmissionTimelineAssembler(
            SubmissionVersionMapper submissionVersionMapper,
            SubmissionStatusHistoryMapper submissionStatusHistoryMapper,
            SubmissionAppealMapper submissionAppealMapper,
            AuditLogMapper auditLogMapper,
            UserDisplayNameResolver userDisplayNameResolver) {
        this.submissionVersionMapper = submissionVersionMapper;
        this.submissionStatusHistoryMapper = submissionStatusHistoryMapper;
        this.submissionAppealMapper = submissionAppealMapper;
        this.auditLogMapper = auditLogMapper;
        this.userDisplayNameResolver = userDisplayNameResolver;
    }

    public List<SubmissionTimelineEntry> buildSubmitHistory(Long submissionId) {
        if (submissionId == null) {
            return List.of();
        }
        LambdaQueryWrapper<SubmissionVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionVersionEntity::getSubmissionId, submissionId)
                .orderByAsc(SubmissionVersionEntity::getSubmittedAt, SubmissionVersionEntity::getId);
        List<SubmissionVersionEntity> versions = submissionVersionMapper.selectList(wrapper);
        List<SubmissionTimelineEntry> entries = new ArrayList<>();
        for (int index = 0; index < versions.size(); index++) {
            SubmissionVersionEntity version = versions.get(index);
            int seq = index + 1;
            String detail = buildSubmitDetail(version);
            entries.add(new SubmissionTimelineEntry(
                    "version-" + version.getId(),
                    "SUBMIT",
                    "R" + (version.getRoundNo() == null ? 1 : version.getRoundNo()),
                    "第 " + seq + " 次提交",
                    detail,
                    version.getSubmittedAt(),
                    version.getDeletedFlag() != null && version.getDeletedFlag() == 1 ? "warning" : "default"));
        }
        entries.sort(Comparator.comparing(SubmissionTimelineEntry::occurredAt,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return entries;
    }

    public List<SubmissionTimelineEntry> buildLifecycleTimeline(Long submissionId, Long assignmentId) {
        if (submissionId == null) {
            return List.of();
        }
        List<SubmissionTimelineEntry> entries = new ArrayList<>();
        entries.addAll(loadStatusHistoryEntries(submissionId));
        entries.addAll(loadAuditEntries(submissionId, assignmentId));
        entries.sort(Comparator.comparing(SubmissionTimelineEntry::occurredAt,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return entries;
    }

    public List<SubmissionRecordSubmitHistory> buildTaskRecordSubmitHistories(
            List<AssignmentEntity> assignments,
            Map<Long, SubmissionEntity> submissionByAssignment,
            Map<Long, TaskItemEntity> itemById) {
        if (assignments == null || assignments.isEmpty()) {
            return List.of();
        }
        List<AssignmentEntity> sorted = assignments.stream()
                .sorted(Comparator
                        .comparing((AssignmentEntity assignment) -> {
                            TaskItemEntity item = itemById.get(assignment.getItemId());
                            return item != null && item.getSeqNo() != null ? item.getSeqNo() : Integer.MAX_VALUE;
                        })
                        .thenComparing(AssignmentEntity::getClaimedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(AssignmentEntity::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<SubmissionRecordSubmitHistory> groups = new ArrayList<>();
        for (AssignmentEntity assignment : sorted) {
            SubmissionEntity submission = submissionByAssignment.get(assignment.getId());
            if (submission == null) {
                continue;
            }
            TaskItemEntity item = itemById.get(assignment.getItemId());
            List<SubmissionTimelineEntry> entries = buildSubmitHistory(submission.getId());
            if (entries.isEmpty()) {
                continue;
            }
            groups.add(new SubmissionRecordSubmitHistory(
                    assignment.getId(),
                    submission.getId(),
                    item == null ? null : item.getSeqNo(),
                    item == null ? null : item.getSourceItemKey(),
                    buildRecordTitle(item, assignment),
                    entries));
        }
        return groups;
    }

    public List<SubmissionTimelineEntry> buildAssignmentLifecycleTimeline(AssignmentEntity entity) {
        if (entity == null || entity.getId() == null) {
            return List.of();
        }
        List<SubmissionTimelineEntry> entries = new ArrayList<>();
        entries.addAll(buildAssignmentMilestoneEntries(entity));
        entries.addAll(loadAssignmentAuditEntries(entity.getId()));
        entries.sort(Comparator.comparing(SubmissionTimelineEntry::occurredAt,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return entries;
    }

    public List<SubmissionTimelineEntry> buildTaskWorkflowTimeline(Long taskId) {
        if (taskId == null) {
            return List.of();
        }
        LambdaQueryWrapper<AuditLogEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AuditLogEntity::getDeletedFlag, 0)
                .eq(AuditLogEntity::getEntityType, "TASK")
                .eq(AuditLogEntity::getEntityId, taskId)
                .orderByAsc(AuditLogEntity::getOccurredAt, AuditLogEntity::getId);
        List<AuditLogEntity> audits = auditLogMapper.selectList(wrapper);
        List<SubmissionTimelineEntry> entries = new ArrayList<>();
        for (AuditLogEntity audit : audits) {
            String operator = audit.getOperatorName();
            if (operator == null || operator.isBlank()) {
                operator = resolveOperatorLabel(audit.getOperatorType(), audit.getOperatorId());
            }
            String detail = operator;
            if (audit.getRemark() != null && !audit.getRemark().isBlank()) {
                detail = detail == null ? audit.getRemark().trim() : detail + " · " + audit.getRemark().trim();
            }
            entries.add(new SubmissionTimelineEntry(
                    "task-audit-" + audit.getId(),
                    "TASK",
                    audit.getActionCode() == null ? "EVENT" : audit.getActionCode(),
                    taskActionLabel(audit.getActionCode()),
                    detail,
                    audit.getOccurredAt() != null ? audit.getOccurredAt() : audit.getCreatedAt(),
                    taskActionTone(audit.getActionCode())));
        }
        entries.sort(Comparator.comparing(SubmissionTimelineEntry::occurredAt,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return entries;
    }

    private static String buildRecordTitle(TaskItemEntity item, AssignmentEntity assignment) {
        List<String> parts = new ArrayList<>();
        if (item != null && item.getSeqNo() != null) {
            parts.add("题目 #" + item.getSeqNo());
        }
        if (item != null && item.getSourceItemKey() != null && !item.getSourceItemKey().isBlank()) {
            parts.add(item.getSourceItemKey().trim());
        }
        if (parts.isEmpty() && assignment.getSlotNo() != null) {
            parts.add("槽位 " + assignment.getSlotNo());
        }
        if (parts.isEmpty()) {
            parts.add("分配 " + assignment.getId());
        }
        return String.join(" · ", parts);
    }

    private List<SubmissionTimelineEntry> loadStatusHistoryEntries(Long submissionId) {
        LambdaQueryWrapper<SubmissionStatusHistoryEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionStatusHistoryEntity::getDeletedFlag, 0)
                .eq(SubmissionStatusHistoryEntity::getSubmissionId, submissionId)
                .orderByAsc(SubmissionStatusHistoryEntity::getOccurredAt, SubmissionStatusHistoryEntity::getId);
        List<SubmissionStatusHistoryEntity> histories = submissionStatusHistoryMapper.selectList(wrapper);
        List<SubmissionAppealEntity> appeals = loadAppeals(submissionId);
        int appealSubmitIndex = 0;
        int appealDecisionIndex = 0;
        List<SubmissionTimelineEntry> entries = new ArrayList<>();
        for (SubmissionStatusHistoryEntity history : histories) {
            String operator = resolveOperatorLabel(history.getOperatorType(), history.getOperatorId());
            String transition = formatTransition(history.getFromStatus(), history.getToStatus());
            String detail = transition;
            if (operator != null) {
                detail = detail + " · " + operator;
            }
            if (history.getReasonText() != null && !history.getReasonText().isBlank()) {
                detail = detail + " · " + history.getReasonText().trim();
            } else if ("SUBMIT_APPEAL".equals(history.getActionCode()) && appealSubmitIndex < appeals.size()) {
                SubmissionAppealEntity appeal = appeals.get(appealSubmitIndex++);
                if (appeal.getReasonText() != null && !appeal.getReasonText().isBlank()) {
                    detail = detail + " · " + appeal.getReasonText().trim();
                }
            } else if (("APPEAL_APPROVE".equals(history.getActionCode())
                    || "APPEAL_REJECT".equals(history.getActionCode()))
                    && appealDecisionIndex < appeals.size()) {
                SubmissionAppealEntity appeal = appeals.get(appealDecisionIndex++);
                if (appeal.getDecisionReasonText() != null && !appeal.getDecisionReasonText().isBlank()) {
                    detail = detail + " · " + appeal.getDecisionReasonText().trim();
                }
            }
            entries.add(new SubmissionTimelineEntry(
                    "status-" + history.getId(),
                    "STATUS",
                    history.getToStatus() == null ? history.getActionCode() : history.getToStatus(),
                    actionLabel(history.getActionCode()),
                    detail,
                    history.getOccurredAt() != null ? history.getOccurredAt() : history.getCreatedAt(),
                    toneForAction(history.getActionCode(), history.getToStatus())));
        }
        return entries;
    }

    private List<SubmissionAppealEntity> loadAppeals(Long submissionId) {
        LambdaQueryWrapper<SubmissionAppealEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionAppealEntity::getDeletedFlag, 0)
                .eq(SubmissionAppealEntity::getSubmissionId, submissionId)
                .orderByAsc(SubmissionAppealEntity::getCreatedAt, SubmissionAppealEntity::getId);
        return submissionAppealMapper.selectList(wrapper);
    }

    private List<SubmissionTimelineEntry> buildAssignmentMilestoneEntries(AssignmentEntity entity) {
        List<SubmissionTimelineEntry> entries = new ArrayList<>();
        addAssignmentMilestone(
                entries,
                "milestone-created-" + entity.getId(),
                entity.getCreatedAt(),
                "ASSIGN",
                "CREATED",
                "创建分配记录",
                assignmentMilestoneDetail(entity, "assignType"));
        if (entity.getAssignedAt() != null
                && !Objects.equals(entity.getAssignedAt(), entity.getCreatedAt())) {
            boolean reassign = isReassignMilestone(entity);
            addAssignmentMilestone(
                    entries,
                    reassign ? "milestone-reassign-" + entity.getId() : "milestone-assigned-" + entity.getId(),
                    entity.getAssignedAt(),
                    reassign ? "REASSIGN" : "ASSIGN",
                    reassign ? "REASSIGNED" : "ASSIGNED",
                    reassign ? "改配分配" : "完成分配",
                    assignmentMilestoneDetail(entity, reassign ? "reassign" : "assignType"));
        }
        addAssignmentMilestone(
                entries,
                "milestone-claimed-" + entity.getId(),
                entity.getClaimedAt(),
                "CLAIM",
                "CLAIMED",
                "标注员认领",
                assignmentMilestoneDetail(entity, "labeler"));
        addAssignmentMilestone(
                entries,
                "milestone-closed-" + entity.getId(),
                entity.getClosedAt(),
                "SUBMIT",
                entity.getStatus() == null ? "CLOSED" : entity.getStatus(),
                "分配提交完成",
                assignmentMilestoneDetail(entity, "status"));
        if (entity.getCanceledAt() != null) {
            String detail = assignmentMilestoneDetail(entity, "status");
            if (entity.getCancelReason() != null && !entity.getCancelReason().isBlank()) {
                detail = detail == null
                        ? entity.getCancelReason().trim()
                        : detail + " · " + entity.getCancelReason().trim();
            }
            addAssignmentMilestone(
                    entries,
                    "milestone-canceled-" + entity.getId(),
                    entity.getCanceledAt(),
                    "CANCEL",
                    "CANCELLED",
                    "取消分配",
                    detail);
        }
        addAssignmentMilestone(
                entries,
                "milestone-revoked-" + entity.getId(),
                entity.getRevokedAt(),
                "REOPEN",
                entity.getStatus() == null ? "REOPENED" : entity.getStatus(),
                "重新打开分配",
                assignmentMilestoneDetail(entity, "status"));
        return entries;
    }

    private void addAssignmentMilestone(
            List<SubmissionTimelineEntry> entries,
            String id,
            Instant occurredAt,
            String category,
            String stage,
            String label,
            String detail) {
        if (occurredAt == null) {
            return;
        }
        entries.add(new SubmissionTimelineEntry(
                id,
                category,
                stage,
                label,
                detail,
                occurredAt,
                assignmentMilestoneTone(category, stage)));
    }

    private static boolean isReassignMilestone(AssignmentEntity entity) {
        if (entity.getAssignedAt() == null || Objects.equals(entity.getAssignedAt(), entity.getCreatedAt())) {
            return false;
        }
        Instant updatedAt = entity.getUpdatedAt();
        if (updatedAt == null || Objects.equals(updatedAt, entity.getCreatedAt())) {
            return false;
        }
        // updateAssignment 将 assignedAt 与 updatedAt 一并刷新为改配时刻
        return !updatedAt.isBefore(entity.getAssignedAt());
    }

    private String assignmentMilestoneDetail(AssignmentEntity entity, String focus) {
        List<String> parts = new ArrayList<>();
        if ("assignType".equals(focus) || "labeler".equals(focus) || "reassign".equals(focus)) {
            if (entity.getAssignType() != null && !entity.getAssignType().isBlank()) {
                parts.add(assignTypeLabel(entity.getAssignType()));
            }
        }
        if (("labeler".equals(focus) || "reassign".equals(focus))
                && entity.getLabelerId() != null && entity.getLabelerId() > 0) {
            String labeler = userDisplayNameResolver.resolve(entity.getLabelerId());
            if (labeler != null && !labeler.isBlank()) {
                parts.add(labeler);
            }
        }
        if ("status".equals(focus) && entity.getStatus() != null && !entity.getStatus().isBlank()) {
            parts.add(entity.getStatus());
        }
        if ("reassign".equals(focus) && entity.getDeadlineAt() != null) {
            parts.add("截止 " + entity.getDeadlineAt());
        }
        if (entity.getSlotNo() != null
                && ("assignType".equals(focus) || "labeler".equals(focus) || "reassign".equals(focus))) {
            parts.add("槽位 " + entity.getSlotNo());
        }
        return parts.isEmpty() ? null : String.join(" · ", parts);
    }

    private static String assignTypeLabel(String assignType) {
        if (assignType == null) {
            return null;
        }
        return switch (assignType) {
            case "MANUAL_ASSIGN" -> "手动分配";
            case "AUTO_CLAIM" -> "自动领取";
            default -> assignType;
        };
    }

    private static String assignmentMilestoneTone(String category, String stage) {
        return switch (category) {
            case "CLAIM", "SUBMIT" -> "success";
            case "CANCEL" -> "destructive";
            case "REOPEN", "REASSIGN" -> "warning";
            default -> "default";
        };
    }

    private List<SubmissionTimelineEntry> loadAssignmentAuditEntries(Long assignmentId) {
        LambdaQueryWrapper<AuditLogEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AuditLogEntity::getDeletedFlag, 0)
                .eq(AuditLogEntity::getEntityType, "ASSIGNMENT")
                .eq(AuditLogEntity::getEntityId, assignmentId)
                .orderByAsc(AuditLogEntity::getOccurredAt, AuditLogEntity::getId);
        List<AuditLogEntity> audits = auditLogMapper.selectList(wrapper);
        List<SubmissionTimelineEntry> entries = new ArrayList<>();
        for (AuditLogEntity audit : audits) {
            if (audit.getActionCode() != null && SKIPPED_AUDIT_ACTIONS.contains(audit.getActionCode())) {
                continue;
            }
            String operator = audit.getOperatorName();
            if (operator == null || operator.isBlank()) {
                operator = resolveOperatorLabel(audit.getOperatorType(), audit.getOperatorId());
            }
            String detail = operator;
            if (audit.getRemark() != null && !audit.getRemark().isBlank()) {
                detail = detail == null ? audit.getRemark().trim() : detail + " · " + audit.getRemark().trim();
            }
            entries.add(new SubmissionTimelineEntry(
                    "assignment-audit-" + audit.getId(),
                    "AUDIT",
                    audit.getActionCode(),
                    auditActionLabel(audit.getActionCode(), audit.getEntityType()),
                    detail,
                    audit.getOccurredAt() != null ? audit.getOccurredAt() : audit.getCreatedAt(),
                    assignmentAuditTone(audit.getActionCode())));
        }
        return entries;
    }

    private static String assignmentAuditTone(String actionCode) {
        if (actionCode == null) {
            return "default";
        }
        return switch (actionCode) {
            case "assignment.claim", "assignment.submit" -> "success";
            case "assignment.cancel", "assignment.batch_cancel" -> "destructive";
            case "assignment.reopen", "assignment.reassign" -> "warning";
            default -> "default";
        };
    }

    private List<SubmissionTimelineEntry> loadAuditEntries(Long submissionId, Long assignmentId) {
        Set<Long> entityIds = new HashSet<>();
        entityIds.add(submissionId);
        if (assignmentId != null) {
            entityIds.add(assignmentId);
        }
        LambdaQueryWrapper<AuditLogEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AuditLogEntity::getDeletedFlag, 0)
                .in(AuditLogEntity::getEntityId, entityIds)
                .in(AuditLogEntity::getEntityType, List.of("SUBMISSION", "ASSIGNMENT"))
                .orderByAsc(AuditLogEntity::getOccurredAt, AuditLogEntity::getId);
        List<AuditLogEntity> audits = auditLogMapper.selectList(wrapper);
        List<SubmissionTimelineEntry> entries = new ArrayList<>();
        for (AuditLogEntity audit : audits) {
            if (audit.getActionCode() != null && SKIPPED_AUDIT_ACTIONS.contains(audit.getActionCode())) {
                continue;
            }
            String operator = audit.getOperatorName();
            if (operator == null || operator.isBlank()) {
                operator = resolveOperatorLabel(audit.getOperatorType(), audit.getOperatorId());
            }
            String detail = operator == null ? null : operator;
            if (audit.getRemark() != null && !audit.getRemark().isBlank()) {
                detail = detail == null ? audit.getRemark().trim() : detail + " · " + audit.getRemark().trim();
            }
            entries.add(new SubmissionTimelineEntry(
                    "audit-" + audit.getId(),
                    "AUDIT",
                    audit.getActionCode(),
                    auditActionLabel(audit.getActionCode(), audit.getEntityType()),
                    detail,
                    audit.getOccurredAt() != null ? audit.getOccurredAt() : audit.getCreatedAt(),
                    "default"));
        }
        return entries;
    }

    private String buildSubmitDetail(SubmissionVersionEntity version) {
        List<String> parts = new ArrayList<>();
        if (version.getSubmitSource() != null && !version.getSubmitSource().isBlank()) {
            parts.add("来源 " + version.getSubmitSource());
        }
        if (version.getDeletedFlag() != null && version.getDeletedFlag() == 1) {
            parts.add("已被后续提交替换");
        }
        return parts.isEmpty() ? null : String.join(" · ", parts);
    }

    private String resolveOperatorLabel(String operatorType, Long operatorId) {
        if (operatorId != null && operatorId > 0) {
            String name = userDisplayNameResolver.resolve(operatorId);
            if (name != null && !name.isBlank()) {
                return name;
            }
        }
        if (operatorType == null || operatorType.isBlank()) {
            return null;
        }
        return switch (operatorType.toUpperCase(Locale.ROOT)) {
            case "LABELER" -> "标注员";
            case "REVIEWER" -> "审核员";
            case "OWNER" -> "任务 Owner";
            case "AI" -> "AI 审核";
            case "SYSTEM" -> "系统";
            default -> operatorType;
        };
    }

    private static String formatTransition(String fromStatus, String toStatus) {
        if (fromStatus == null || fromStatus.isBlank()) {
            return toStatus == null ? "状态变更" : toStatus;
        }
        if (toStatus == null || toStatus.isBlank()) {
            return fromStatus;
        }
        return fromStatus + " → " + toStatus;
    }

    private static String actionLabel(String actionCode) {
        if (actionCode == null) {
            return "状态变更";
        }
        return switch (actionCode) {
            case "SUBMIT" -> "提交标注";
            case "RESUBMIT_AFTER_REVISION" -> "修改后重新提交";
            case "RESUBMIT_AFTER_AI_APPEAL" -> "申诉通过后提交（人工审核）";
            case "RESUBMIT_AFTER_HUMAN_APPEAL" -> "申诉通过后提交（跳过人工终审）";
            case "ENTER_AI_REVIEW_APPEAL_HUMAN" -> "进入 AI 审核（申诉人工路径）";
            case "AI_PASS_APPEAL_HUMAN" -> "AI 审核通过（跳过人工终审）";
            case "WITHDRAW" -> "撤回继续标注";
            case "ENTER_AI_REVIEW" -> "进入 AI 审核";
            case "AI_PASS" -> "AI 审核通过";
            case "AI_REJECT" -> "AI 审核不通过";
            case "AI_REQUIRE_HUMAN" -> "转入人工审核";
            case "ENTER_HUMAN_REVIEW" -> "进入人工审核";
            case "APPROVE" -> "审核通过";
            case "REJECT" -> "审核驳回";
            case "RETURN_FOR_REVISION" -> "打回修改";
            case "SUBMIT_APPEAL" -> "发起申诉";
            case "APPEAL_APPROVE" -> "申诉通过";
            case "APPEAL_REJECT" -> "申诉驳回";
            default -> actionCode;
        };
    }

    private static String auditActionLabel(String actionCode, String entityType) {
        if (actionCode == null) {
            return "AUDIT".equalsIgnoreCase(entityType) ? "审计记录" : entityType;
        }
        return switch (actionCode) {
            case "submission.create_draft" -> "创建草稿";
            case "submission.save_draft" -> "保存草稿";
            case "submission.submit" -> "提交操作";
            case "assignment.create" -> "创建分配";
            case "assignment.batch_create" -> "批量创建分配";
            case "assignment.batch_cancel" -> "批量取消分配";
            case "assignment.claim" -> "认领分配";
            case "assignment.save_draft" -> "保存草稿";
            case "assignment.submit" -> "分配提交";
            case "assignment.reopen" -> "重新打开分配";
            case "assignment.reassign" -> "改配分配";
            case "assignment.cancel" -> "取消分配";
            default -> actionCode.replace('.', ' ');
        };
    }

    private static String taskActionLabel(String actionCode) {
        if (actionCode == null) {
            return "任务事件";
        }
        return switch (actionCode) {
            case "task.create" -> "创建任务";
            case "task.update" -> "更新任务";
            case "task.publish" -> "发布任务";
            case "task.pause" -> "暂停任务";
            case "task.delete" -> "删除任务";
            case "task.import_items" -> "导入题目";
            case "task.template_save" -> "保存模板";
            default -> actionCode.replace('.', ' ');
        };
    }

    private static String taskActionTone(String actionCode) {
        if (actionCode == null) {
            return "default";
        }
        return switch (actionCode) {
            case "task.publish" -> "success";
            case "task.pause", "task.delete" -> "warning";
            default -> "default";
        };
    }

    private static String toneForAction(String actionCode, String toStatus) {
        if (actionCode == null) {
            return "default";
        }
        return switch (actionCode) {
            case "APPROVE", "AI_PASS", "APPEAL_APPROVE" -> "success";
            case "REJECT", "AI_REJECT", "APPEAL_REJECT" -> "destructive";
            case "RETURN_FOR_REVISION", "WITHDRAW", "AI_REQUIRE_HUMAN", "SUBMIT_APPEAL" -> "warning";
            default -> Objects.equals(toStatus, "APPROVED") ? "success"
                    : Objects.equals(toStatus, "REJECTED") ? "destructive" : "default";
        };
    }
}
