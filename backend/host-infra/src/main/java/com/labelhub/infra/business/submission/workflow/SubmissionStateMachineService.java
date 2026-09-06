package com.labelhub.infra.business.submission.workflow;

import com.labelhub.core.audit.Audit;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.statemachine.StateMachineEngine;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStateMachineFactory;
import com.labelhub.infra.statemachine.SubmissionStatus;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionStateMachineService {
    private final SubmissionMapper submissionMapper;
    private final TaskMapper taskMapper;
    private final SubmissionTransitionPolicy submissionTransitionPolicy;
    private final SubmissionStatusHistoryWriter submissionStatusHistoryWriter;
    private final StateMachineEngine<SubmissionStatus, SubmissionEvent> standardMachine;

    public SubmissionStateMachineService(
            SubmissionMapper submissionMapper,
            TaskMapper taskMapper,
            SubmissionTransitionPolicy submissionTransitionPolicy,
            SubmissionStatusHistoryWriter submissionStatusHistoryWriter) {
        this.submissionMapper = submissionMapper;
        this.taskMapper = taskMapper;
        this.submissionTransitionPolicy = submissionTransitionPolicy;
        this.submissionStatusHistoryWriter = submissionStatusHistoryWriter;
        this.standardMachine = SubmissionStateMachineFactory.createStandardMachine();
    }

    public SubmissionStatus getNextState(Long submissionId, SubmissionEvent event) {
        SubmissionEntity entity = requireSubmission(submissionId);
        SubmissionStatus currentStatus = SubmissionStatus.valueOf(entity.getCurrentStatus());
        ensurePolicyAllows(entity, event);
        return standardMachine.fire(currentStatus, event);
    }

    public boolean canTransition(Long submissionId, SubmissionEvent event) {
        SubmissionEntity entity = submissionMapper.selectById(submissionId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            return false;
        }
        SubmissionStatus currentStatus = SubmissionStatus.valueOf(entity.getCurrentStatus());
        if (!standardMachine.canTransition(currentStatus, event)) {
            return false;
        }
        return submissionTransitionPolicy.evaluate(entity, loadTask(entity), event).allowed();
    }

    @Transactional
    @Audit(entityType = "SUBMISSION", actionCode = "submission.transition", entityId = "#submissionId")
    public SubmissionStatus transition(Long submissionId, SubmissionEvent event) {
        SubmissionEntity entity = requireSubmission(submissionId);
        SubmissionStatus currentStatus = SubmissionStatus.valueOf(entity.getCurrentStatus());
        ensurePolicyAllows(entity, event);
        SubmissionStatus nextStatus = standardMachine.fire(currentStatus, event);
        entity.setCurrentStatus(nextStatus.name());
        entity.setUpdatedAt(Instant.now());
        submissionMapper.updateById(entity);
        submissionStatusHistoryWriter.recordTransition(entity, currentStatus, nextStatus, event);
        return nextStatus;
    }

    public StateMachineEngine<SubmissionStatus, SubmissionEvent> getStandardMachine() {
        return standardMachine;
    }

    private SubmissionEntity requireSubmission(Long submissionId) {
        SubmissionEntity entity = submissionMapper.selectById(submissionId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        return entity;
    }

    private TaskEntity loadTask(SubmissionEntity entity) {
        return entity.getTaskId() == null ? null : taskMapper.selectById(entity.getTaskId());
    }

    private void ensurePolicyAllows(SubmissionEntity entity, SubmissionEvent event) {
        SubmissionTransitionPolicy.TransitionDecision decision = submissionTransitionPolicy.evaluate(entity,
                loadTask(entity), event);
        if (!decision.allowed()) {
            throw new BusinessException(ErrorCode.SUBMISSION_STATUS_INVALID, decision.blockReason());
        }
    }
}
