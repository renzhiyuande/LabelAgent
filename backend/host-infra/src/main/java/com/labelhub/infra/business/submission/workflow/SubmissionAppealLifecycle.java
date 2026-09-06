package com.labelhub.infra.business.submission.workflow;

import com.labelhub.core.business.BusinessDtos.SubmissionAppealDecisionCommand;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.assignment.workflow.AssignmentStateMachineService;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.entity.SubmissionAppealEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.SubmissionAppealMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.statemachine.SubmissionEvent;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionAppealLifecycle {
    private final SubmissionMapper submissionMapper;
    private final SubmissionAppealMapper submissionAppealMapper;
    private final TaskMapper taskMapper;
    private final AssignmentMapper assignmentMapper;
    private final SubmissionStateMachineService submissionStateMachineService;
    private final AssignmentStateMachineService assignmentStateMachineService;

    public SubmissionAppealLifecycle(
            SubmissionMapper submissionMapper,
            SubmissionAppealMapper submissionAppealMapper,
            TaskMapper taskMapper,
            AssignmentMapper assignmentMapper,
            SubmissionStateMachineService submissionStateMachineService,
            AssignmentStateMachineService assignmentStateMachineService) {
        this.submissionMapper = submissionMapper;
        this.submissionAppealMapper = submissionAppealMapper;
        this.taskMapper = taskMapper;
        this.assignmentMapper = assignmentMapper;
        this.submissionStateMachineService = submissionStateMachineService;
        this.assignmentStateMachineService = assignmentStateMachineService;
    }

    @Transactional
    public SubmissionAppealEntity submitAppeal(SubmissionEntity submission, String reasonText, String batchKey) {
        if (submission == null || submission.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        TaskEntity task = taskMapper.selectById(submission.getTaskId());
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }

        submissionStateMachineService.transition(submission.getId(), SubmissionEvent.SUBMIT_APPEAL);
        SubmissionEntity refreshed = submissionMapper.selectById(submission.getId());
        int appealNo = (refreshed.getAppealCount() == null ? 0 : refreshed.getAppealCount()) + 1;
        refreshed.setAppealCount(appealNo);
        refreshed.setLastAppealedAt(Instant.now());
        refreshed.setLastActionCode("SUBMIT_APPEAL");
        refreshed.setLastActionAt(Instant.now());
        refreshed.setUpdatedAt(Instant.now());
        submissionMapper.updateById(refreshed);

        SubmissionAppealEntity appeal = new SubmissionAppealEntity();
        appeal.setSubmissionId(refreshed.getId());
        appeal.setAssignmentId(refreshed.getAssignmentId());
        appeal.setTaskId(refreshed.getTaskId());
        appeal.setLabelerId(refreshed.getLabelerId());
        appeal.setOwnerId(task.getOwnerId());
        appeal.setAppealNo(appealNo);
        appeal.setStatus("PENDING");
        appeal.setReasonText(reasonText == null ? null : reasonText.trim());
        appeal.setBatchKey(batchKey);
        appeal.setCreatedAt(Instant.now());
        appeal.setUpdatedAt(Instant.now());
        submissionAppealMapper.insert(appeal);
        return appeal;
    }

    @Transactional
    public SubmissionAppealEntity decideAppeal(
            SubmissionAppealEntity appeal,
            SubmissionAppealDecisionCommand command,
            Long operatorId,
            String batchKey) {
        if (appeal == null || appeal.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Appeal not found");
        }
        if (!"PENDING".equals(appeal.getStatus())) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "Appeal already decided");
        }

        SubmissionEntity submission = submissionMapper.selectById(appeal.getSubmissionId());
        if (submission == null || submission.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        SubmissionEvent event = "APPROVE".equals(command.decision())
                ? SubmissionEvent.APPEAL_APPROVE
                : SubmissionEvent.APPEAL_REJECT;
        submissionStateMachineService.transition(submission.getId(), event);

        SubmissionEntity refreshed = submissionMapper.selectById(submission.getId());
        refreshed.setLastActionCode(event.name());
        refreshed.setLastActionAt(Instant.now());
        refreshed.setUpdatedAt(Instant.now());
        if (event == SubmissionEvent.APPEAL_APPROVE) {
            refreshed.setFinalizedAt(null);
            AssignmentEntity assignment = assignmentMapper.selectById(refreshed.getAssignmentId());
            if (assignment != null && assignment.getDeletedFlag() == 0) {
                assignmentStateMachineService.transition(assignment.getId(), AssignmentEvent.WITHDRAW_SUBMISSION);
                AssignmentEntity assignmentRefreshed = assignmentMapper.selectById(assignment.getId());
                assignmentRefreshed.setClosedAt(null);
                assignmentRefreshed.setUpdatedAt(Instant.now());
                assignmentMapper.updateById(assignmentRefreshed);
            }
        }
        submissionMapper.updateById(refreshed);

        appeal.setStatus(event == SubmissionEvent.APPEAL_APPROVE ? "APPROVED" : "REJECTED");
        appeal.setDecisionReasonText(command.decisionReasonText());
        appeal.setDecidedBy(operatorId);
        appeal.setDecidedAt(Instant.now());
        appeal.setBatchKey(batchKey);
        appeal.setUpdatedAt(Instant.now());
        submissionAppealMapper.updateById(appeal);
        return submissionAppealMapper.selectById(appeal.getId());
    }
}
