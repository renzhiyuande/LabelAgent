package com.labelhub.infra.business.submission.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.statemachine.SubmissionStatus;
import java.time.Instant;
import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionCurrentSupport {

    public static final int CURRENT_FLAG = 1;

    private final SubmissionMapper submissionMapper;
    private final TaskMapper taskMapper;
    private final TemplateVersionMapper templateVersionMapper;

    public SubmissionCurrentSupport(
            SubmissionMapper submissionMapper,
            TaskMapper taskMapper,
            TemplateVersionMapper templateVersionMapper) {
        this.submissionMapper = submissionMapper;
        this.taskMapper = taskMapper;
        this.templateVersionMapper = templateVersionMapper;
    }

    public Optional<SubmissionEntity> findCurrentByAssignmentId(Long assignmentId) {
        if (assignmentId == null) {
            return Optional.empty();
        }
        LambdaQueryWrapper<SubmissionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionEntity::getDeletedFlag, 0)
                .eq(SubmissionEntity::getAssignmentId, assignmentId)
                .eq(SubmissionEntity::getIsCurrent, CURRENT_FLAG)
                .last("LIMIT 1");
        return Optional.ofNullable(submissionMapper.selectOne(wrapper));
    }

    @Transactional
    public SubmissionEntity ensureCurrentDraftForAssignment(AssignmentEntity assignment, String supersedeReason) {
        if (assignment == null || assignment.getDeletedFlag() == null || assignment.getDeletedFlag() != 0) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        Long expectedLabelerId = normalizeLabelerId(assignment.getLabelerId());
        if (expectedLabelerId <= 0) {
            return findCurrentByAssignmentId(assignment.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND));
        }

        SubmissionEntity current = findCurrentByAssignmentId(assignment.getId()).orElse(null);
        if (current != null) {
            Long currentLabelerId = normalizeLabelerId(current.getLabelerId());
            if (expectedLabelerId.equals(currentLabelerId)) {
                if (SubmissionStatus.allowsLabelerDraftEdit(current.getCurrentStatus())) {
                    return current;
                }
                if (isAbandonedStaleCurrent(current)) {
                    supersedeCurrent(current, supersedeReason);
                    return insertNewDraftResilient(assignment, supersedeReason);
                }
                return current;
            }
            supersedeCurrent(current, supersedeReason);
        }
        return insertNewDraftResilient(assignment, supersedeReason);
    }

    public void realignCurrentSubmissionOnLabelerChange(Long assignmentId, Long newLabelerId) {
        if (assignmentId == null || newLabelerId == null || newLabelerId <= 0) {
            return;
        }
        SubmissionEntity current = findCurrentByAssignmentId(assignmentId).orElse(null);
        if (current == null) {
            return;
        }
        if (newLabelerId.equals(normalizeLabelerId(current.getLabelerId()))) {
            return;
        }
        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setId(assignmentId);
        assignment.setTaskId(current.getTaskId());
        assignment.setItemId(current.getItemId());
        assignment.setLabelerId(newLabelerId);
        assignment.setCurrentRoundNo(current.getCurrentRoundNo());
        assignment.setDeletedFlag(0);
        supersedeCurrent(current, SubmissionSupersedeReason.LABELER_REASSIGNED.name());
        insertNewDraftResilient(assignment, SubmissionSupersedeReason.LABELER_REASSIGNED.name());
    }

    public void supersedeCurrent(SubmissionEntity current, String reason) {
        Instant now = Instant.now();
        // updateById 默认忽略 null 字段，必须显式 SET is_current = NULL 才能释放唯一键槽位
        LambdaUpdateWrapper<SubmissionEntity> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(SubmissionEntity::getId, current.getId())
                .set(SubmissionEntity::getIsCurrent, null)
                .set(SubmissionEntity::getSupersededAt, now)
                .set(SubmissionEntity::getSupersededReason, reason)
                .set(SubmissionEntity::getCurrentStatus, SubmissionStatus.ABANDONED.name())
                .set(SubmissionEntity::getLastActionCode, "ABANDONED")
                .set(SubmissionEntity::getLastActionAt, now)
                .set(SubmissionEntity::getUpdatedAt, now);
        submissionMapper.update(null, wrapper);
        current.setIsCurrent(null);
        current.setSupersededAt(now);
        current.setSupersededReason(reason);
        current.setCurrentStatus(SubmissionStatus.ABANDONED.name());
        current.setLastActionCode("ABANDONED");
        current.setLastActionAt(now);
        current.setUpdatedAt(now);
    }

    public boolean isCurrentSubmission(SubmissionEntity entity) {
        return entity != null && Integer.valueOf(CURRENT_FLAG).equals(entity.getIsCurrent());
    }

    /**
     * 并发打开工作台/领取题目时可能同时 insert；唯一键冲突后回读当前 submission。
     */
    private SubmissionEntity insertNewDraftResilient(AssignmentEntity assignment, String supersedeReason) {
        try {
            return insertNewDraft(assignment);
        } catch (DuplicateKeyException ex) {
            SubmissionEntity existing = findCurrentByAssignmentId(assignment.getId()).orElse(null);
            if (existing == null) {
                throw ex;
            }
            Long expectedLabelerId = normalizeLabelerId(assignment.getLabelerId());
            if (expectedLabelerId.equals(normalizeLabelerId(existing.getLabelerId()))) {
                if (SubmissionStatus.allowsLabelerDraftEdit(existing.getCurrentStatus())) {
                    return existing;
                }
                if (isAbandonedStaleCurrent(existing)) {
                    supersedeCurrent(existing, supersedeReason);
                    return insertNewDraft(assignment);
                }
                return existing;
            }
            supersedeCurrent(existing, supersedeReason);
            return insertNewDraft(assignment);
        }
    }

    /** ABANDONED 但仍占 is_current=1（历史 updateById 未清空 null 字段） */
    private static boolean isAbandonedStaleCurrent(SubmissionEntity entity) {
        return entity != null
                && Integer.valueOf(CURRENT_FLAG).equals(entity.getIsCurrent())
                && SubmissionStatus.ABANDONED.name().equals(entity.getCurrentStatus());
    }

    private SubmissionEntity insertNewDraft(AssignmentEntity assignment) {
        TaskEntity task = taskMapper.selectById(assignment.getTaskId());
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        Long effectiveTemplateVersionId = resolveAndSyncTemplateVersionId(task);
        if (effectiveTemplateVersionId == null) {
            throw new BusinessException(
                    ErrorCode.TASK_TEMPLATE_NOT_READY,
                    "任务尚未配置可用模板，请联系任务管理员");
        }
        SubmissionEntity entity = new SubmissionEntity();
        entity.setAssignmentId(assignment.getId());
        entity.setTaskId(assignment.getTaskId());
        entity.setItemId(assignment.getItemId());
        entity.setLabelerId(normalizeLabelerId(assignment.getLabelerId()));
        entity.setCurrentTemplateVersionId(effectiveTemplateVersionId);
        entity.setCurrentRoundNo(assignment.getCurrentRoundNo() == null ? 1 : assignment.getCurrentRoundNo());
        entity.setCurrentStatus(SubmissionStatus.DRAFT.name());
        entity.setSubmitCount(0);
        entity.setReturnCount(0);
        entity.setReopenCount(0);
        entity.setVersionNo(1);
        entity.setIsCurrent(CURRENT_FLAG);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        submissionMapper.insert(entity);
        return entity;
    }

    private Long resolveAndSyncTemplateVersionId(TaskEntity task) {
        if (task.getCurrentTemplateVersionId() != null) {
            TemplateVersionEntity current = templateVersionMapper.selectById(task.getCurrentTemplateVersionId());
            if (current != null && current.getDeletedFlag() == 0 && "PUBLISHED".equals(current.getStatus())) {
                return current.getId();
            }
        }
        TemplateVersionEntity fallback = findLatestPublishedTemplateVersion(task.getId());
        if (fallback == null) {
            return null;
        }
        task.setCurrentTemplateVersionId(fallback.getId());
        task.setUpdatedAt(Instant.now());
        taskMapper.updateById(task);
        return fallback.getId();
    }

    private TemplateVersionEntity findLatestPublishedTemplateVersion(Long taskId) {
        LambdaQueryWrapper<TemplateVersionEntity> byTask = new LambdaQueryWrapper<>();
        byTask.eq(TemplateVersionEntity::getTaskId, taskId);
        byTask.eq(TemplateVersionEntity::getDeletedFlag, 0);
        byTask.eq(TemplateVersionEntity::getStatus, "PUBLISHED");
        byTask.orderByDesc(TemplateVersionEntity::getIsCurrent);
        byTask.orderByDesc(TemplateVersionEntity::getVersionNo);
        byTask.last("LIMIT 1");
        return templateVersionMapper.selectOne(byTask);
    }

    private static Long normalizeLabelerId(Long labelerId) {
        return labelerId == null ? 0L : labelerId;
    }
}
