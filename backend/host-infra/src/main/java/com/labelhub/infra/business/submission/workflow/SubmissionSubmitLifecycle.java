package com.labelhub.infra.business.submission.workflow;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.form.TemplateSubmissionDataValidator;
import com.labelhub.infra.async.AsyncTaskService;
import com.labelhub.infra.business.review.handler.AiReviewTaskHandler;
import com.labelhub.infra.business.review.support.ReviewWorkflowResolver;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.SubmissionVersionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.SubmissionVersionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import com.labelhub.infra.util.SchemaChecksumUtil;
import java.time.Instant;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 提交生命周期管理器
 *
 * <p>
 * 负责处理标注提交的完整生命周期，包括提交、审核流转等核心逻辑。
 * AI 审核通过异步任务执行器（{@link AsyncTaskService}）入队，由 {@link AiReviewTaskHandler} 处理。
 */
@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionSubmitLifecycle {
    private final SubmissionMapper submissionMapper;
    private final SubmissionVersionMapper submissionVersionMapper;
    private final SubmissionStateMachineService submissionStateMachineService;
    private final ObjectMapper objectMapper;
    private final AsyncTaskService asyncTaskService;
    private final TemplateSubmissionDataValidator templateSubmissionDataValidator;
    private final TaskMapper taskMapper;
    private final ReviewWorkflowResolver reviewWorkflowResolver;

    public SubmissionSubmitLifecycle(
            SubmissionMapper submissionMapper,
            SubmissionVersionMapper submissionVersionMapper,
            SubmissionStateMachineService submissionStateMachineService,
            ObjectMapper objectMapper,
            AsyncTaskService asyncTaskService,
            TemplateSubmissionDataValidator templateSubmissionDataValidator,
            TaskMapper taskMapper,
            ReviewWorkflowResolver reviewWorkflowResolver) {
        this.submissionMapper = submissionMapper;
        this.submissionVersionMapper = submissionVersionMapper;
        this.submissionStateMachineService = submissionStateMachineService;
        this.objectMapper = objectMapper;
        this.asyncTaskService = asyncTaskService;
        this.templateSubmissionDataValidator = templateSubmissionDataValidator;
        this.taskMapper = taskMapper;
        this.reviewWorkflowResolver = reviewWorkflowResolver;
    }

    @Transactional
    public SubmissionEntity submit(SubmissionEntity entity, Map<String, Object> submitData) {
        SubmissionEvent submitEvent = resolveSubmitEvent(entity);
        if (submitEvent == null) {
            throw new BusinessException(ErrorCode.SUBMISSION_STATUS_INVALID);
        }

        templateSubmissionDataValidator.validateAnnotateSubmitData(
                entity.getCurrentTemplateVersionId(), submitData);

        submissionStateMachineService.transition(entity.getId(), submitEvent);

        SubmissionEntity refreshed = requireSubmission(entity.getId());
        refreshed.setSubmitCount((refreshed.getSubmitCount() == null ? 0 : refreshed.getSubmitCount()) + 1);
        refreshed.setDraftDataJson(writeJson(submitData));
        refreshed.setLastSubmittedAt(Instant.now());
        refreshed.setLastActionCode(submitEvent.name());
        refreshed.setLastActionAt(Instant.now());
        refreshed.setFinalizedAt(null);
        refreshed.setUpdatedAt(Instant.now());
        refreshed.setCurrentVersionId(createSubmissionVersion(refreshed, submitData));
        if (submitEvent == SubmissionEvent.RESUBMIT_AFTER_AI_APPEAL) {
            applyHumanReviewLevels(refreshed);
        } else {
            refreshed.setCurrentReviewLevel(null);
            refreshed.setNextReviewLevel(null);
        }
        submissionMapper.updateById(refreshed);

        if (submitEvent == SubmissionEvent.RESUBMIT_AFTER_AI_APPEAL) {
            return requireSubmission(entity.getId());
        }
        if (submitEvent == SubmissionEvent.RESUBMIT_AFTER_HUMAN_APPEAL) {
            transitionIfAllowed(refreshed.getId(), SubmissionEvent.ENTER_AI_REVIEW_APPEAL_HUMAN);
        } else {
            transitionIfAllowed(refreshed.getId(), SubmissionEvent.ENTER_AI_REVIEW);
        }
        int submitCount = refreshed.getSubmitCount() == null ? 1 : refreshed.getSubmitCount();
        asyncTaskService.enqueue("AI_REVIEW", "SUBMISSION", refreshed.getId(),
                "ai-review:" + refreshed.getId() + ":" + submitCount, 5, Map.of());
        return requireSubmission(entity.getId());
    }

    private void applyHumanReviewLevels(SubmissionEntity submission) {
        if (submission.getTaskId() == null) {
            submission.setCurrentReviewLevel(null);
            submission.setNextReviewLevel(null);
            return;
        }
        TaskEntity task = taskMapper.selectById(submission.getTaskId());
        if (task == null || task.getDeletedFlag() != null && task.getDeletedFlag() == 1) {
            submission.setCurrentReviewLevel(null);
            submission.setNextReviewLevel(null);
            return;
        }
        String workflowJson = task.getReviewWorkflowJson();
        String firstLevel = reviewWorkflowResolver.firstLevel(workflowJson);
        submission.setCurrentReviewLevel(firstLevel);
        submission.setNextReviewLevel(reviewWorkflowResolver.nextLevel(workflowJson, firstLevel));
    }

    private void transitionIfAllowed(Long submissionId, SubmissionEvent event) {
        if (submissionStateMachineService.canTransition(submissionId, event)) {
            submissionStateMachineService.transition(submissionId, event);
        }
    }

    private SubmissionEvent resolveSubmitEvent(SubmissionEntity entity) {
        return switch (SubmissionStatus.valueOf(entity.getCurrentStatus())) {
            case DRAFT -> SubmissionEvent.SUBMIT;
            case NEEDS_REVISION -> SubmissionEvent.RESUBMIT_AFTER_REVISION;
            case APPEAL_APPROVED_SKIP_AI -> SubmissionEvent.RESUBMIT_AFTER_AI_APPEAL;
            case APPEAL_APPROVED_SKIP_HUMAN -> SubmissionEvent.RESUBMIT_AFTER_HUMAN_APPEAL;
            default -> null;
        };
    }

    private SubmissionEntity requireSubmission(Long submissionId) {
        SubmissionEntity entity = submissionMapper.selectById(submissionId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        return entity;
    }

    private Long createSubmissionVersion(SubmissionEntity entity, Map<String, Object> submitData) {
        Map<String, Object> payload = submitData == null ? Map.of() : submitData;
        String submitJson = writeJson(payload);
        String submitHash = SchemaChecksumUtil.computeChecksum(payload);
        if (submitHash == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Submit data is required");
        }

        int roundNo = entity.getCurrentRoundNo() == null ? 1 : entity.getCurrentRoundNo();
        supersedeExistingVersion(entity.getId(), roundNo);
        Long previousVersionId = findPreviousVersionId(entity.getId(), roundNo);

        SubmissionVersionEntity version = new SubmissionVersionEntity();
        version.setSubmissionId(entity.getId());
        version.setAssignmentId(entity.getAssignmentId());
        version.setTaskId(entity.getTaskId());
        version.setItemId(entity.getItemId());
        version.setLabelerId(entity.getLabelerId());
        version.setRoundNo(roundNo);
        version.setTemplateVersionId(entity.getCurrentTemplateVersionId());
        version.setSubmitSource("MANUAL");
        version.setSubmitDataJson(submitJson);
        version.setSubmitDataHash(submitHash);
        version.setPreviousVersionId(previousVersionId);
        version.setSubmittedAt(Instant.now());
        version.setCreatedAt(Instant.now());
        version.setUpdatedAt(Instant.now());
        submissionVersionMapper.insert(version);
        return version.getId();
    }

    private void supersedeExistingVersion(Long submissionId, int roundNo) {
        LambdaQueryWrapper<SubmissionVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionVersionEntity::getDeletedFlag, 0)
                .eq(SubmissionVersionEntity::getSubmissionId, submissionId)
                .eq(SubmissionVersionEntity::getRoundNo, roundNo);
        SubmissionVersionEntity existing = submissionVersionMapper.selectOne(wrapper);
        if (existing == null) {
            return;
        }
        existing.setDeletedFlag(1);
        existing.setUpdatedAt(Instant.now());
        submissionVersionMapper.updateById(existing);
    }

    private Long findPreviousVersionId(Long submissionId, int roundNo) {
        if (roundNo <= 1) {
            return null;
        }
        LambdaQueryWrapper<SubmissionVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionVersionEntity::getDeletedFlag, 0)
                .eq(SubmissionVersionEntity::getSubmissionId, submissionId)
                .eq(SubmissionVersionEntity::getRoundNo, roundNo - 1)
                .last("LIMIT 1");
        SubmissionVersionEntity previous = submissionVersionMapper.selectOne(wrapper);
        return previous == null ? null : previous.getId();
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid submit data");
        }
    }
}
