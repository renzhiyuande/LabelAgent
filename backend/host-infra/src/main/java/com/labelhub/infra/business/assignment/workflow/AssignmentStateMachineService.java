package com.labelhub.infra.business.assignment.workflow;

import com.labelhub.core.audit.Audit;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.statemachine.StateMachineEngine;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.statemachine.AssignmentStateMachineFactory;
import com.labelhub.infra.statemachine.AssignmentStatus;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AssignmentStateMachineService {
    private final AssignmentMapper assignmentMapper;
    private final CurrentUserProvider currentUserProvider;
    private final StateMachineEngine<AssignmentStatus, AssignmentEvent> assignmentMachine;

    public AssignmentStateMachineService(AssignmentMapper assignmentMapper, CurrentUserProvider currentUserProvider) {
        this.assignmentMapper = assignmentMapper;
        this.currentUserProvider = currentUserProvider;
        this.assignmentMachine = AssignmentStateMachineFactory.createAssignmentMachine();
    }

    public AssignmentStatus getNextState(Long assignmentId, AssignmentEvent event) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        AssignmentStatus currentStatus = AssignmentStatus.valueOf(entity.getStatus());
        return assignmentMachine.fire(currentStatus, event);
    }

    public boolean canTransition(Long assignmentId, AssignmentEvent event) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            return false;
        }
        AssignmentStatus currentStatus = AssignmentStatus.valueOf(entity.getStatus());
        return assignmentMachine.canTransition(currentStatus, event);
    }

    @Transactional
    @Audit(entityType = "ASSIGNMENT", actionCode = "assignment.transition", entityId = "#assignmentId")
    public AssignmentStatus transition(Long assignmentId, AssignmentEvent event) {
        AssignmentEntity entity = assignmentMapper.selectById(assignmentId);
        if (entity == null || entity.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.ASSIGNMENT_NOT_FOUND);
        }
        AssignmentStatus currentStatus = AssignmentStatus.valueOf(entity.getStatus());
        AssignmentStatus nextStatus = assignmentMachine.fire(currentStatus, event);
        entity.setStatus(nextStatus.name());
        entity.setUpdatedAt(Instant.now());
        assignmentMapper.updateById(entity);
        return nextStatus;
    }

    public StateMachineEngine<AssignmentStatus, AssignmentEvent> getAssignmentMachine() {
        return assignmentMachine;
    }
}
