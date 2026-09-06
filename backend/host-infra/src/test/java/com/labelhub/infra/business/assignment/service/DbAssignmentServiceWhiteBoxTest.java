package com.labelhub.infra.business.assignment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.business.BusinessDtos.AssignmentSummary;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.assignment.workflow.AssignmentStateMachineService;
import com.labelhub.infra.business.display.assembler.AssignmentSummaryAssembler;
import com.labelhub.infra.business.submission.support.SubmissionCurrentSupport;
import com.labelhub.infra.lowcode.query.MybatisQueryApplier;
import com.labelhub.infra.persistence.entity.AssignmentEntity;
import com.labelhub.infra.persistence.mapper.AssignmentMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import com.labelhub.infra.statemachine.AssignmentEvent;
import com.labelhub.infra.statemachine.AssignmentStatus;
import com.labelhub.infra.system.CurrentUserContext;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * P0 白盒：分配服务层状态机联动（WB-ASSIGN-001 ~ WB-ASSIGN-010）
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("P0 白盒 — Assignment 服务")
class DbAssignmentServiceWhiteBoxTest {

    @Mock
    private AssignmentMapper assignmentMapper;
    @Mock
    private SubmissionCurrentSupport submissionCurrentSupport;
    @Mock
    private TaskItemMapper taskItemMapper;
    @Mock
    private AssignmentStateMachineService assignmentStateMachineService;
    @Mock
    private CurrentUserContext currentUserContext;
    @Mock
    private MybatisQueryApplier queryApplier;
    @Mock
    private AssignmentSummaryAssembler summaryAssembler;
    @Mock
    private CurrentUserProvider currentUserProvider;

    private DbAssignmentService assignmentService;
    private AssignmentStateMachineService stateMachineService;

    @BeforeAll
    static void initMybatisPlusEntityMetadata() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant =
                new MapperBuilderAssistant(configuration, DbAssignmentServiceWhiteBoxTest.class.getName());
        TableInfoHelper.initTableInfo(assistant, AssignmentEntity.class);
    }

    @BeforeEach
    void setUp() {
        assignmentService = new DbAssignmentService(
                assignmentMapper,
                submissionCurrentSupport,
                taskItemMapper,
                assignmentStateMachineService,
                currentUserContext,
                new ObjectMapper(),
                queryApplier,
                summaryAssembler);
        stateMachineService = new AssignmentStateMachineService(assignmentMapper, currentUserProvider);
    }

    @Test
    @DisplayName("WB-ASSIGN-001: UNCLAIMED + CLAIM → CLAIMED")
    void wbAssign001_claimTransitionsToClaimed() {
        AssignmentEntity entity = unclaimed(1L);
        when(assignmentMapper.selectById(1L)).thenReturn(entity);
        when(currentUserContext.userIdOrZero()).thenReturn(42L);
        when(assignmentStateMachineService.transition(1L, AssignmentEvent.CLAIM))
                .thenReturn(AssignmentStatus.CLAIMED);
        when(summaryAssembler.assemble(any(AssignmentEntity.class))).thenReturn(summaryFor(entity));

        assignmentService.claimAssignment(1L);

        verify(assignmentStateMachineService).transition(1L, AssignmentEvent.CLAIM);
        verify(assignmentMapper).updateById(entity);
    }

    @Test
    @DisplayName("WB-ASSIGN-002: UNCLAIMED + CANCEL → CANCELLED")
    void wbAssign002_cancelFromUnclaimed() {
        AssignmentEntity entity = unclaimed(2L);
        when(assignmentMapper.selectById(2L)).thenReturn(entity);
        when(assignmentStateMachineService.transition(2L, AssignmentEvent.CANCEL))
                .thenReturn(AssignmentStatus.CANCELLED);

        assignmentService.cancelAssignment(2L, "test cancel");

        verify(assignmentStateMachineService).transition(2L, AssignmentEvent.CANCEL);
    }

    @Test
    @DisplayName("WB-ASSIGN-003: CLAIMED + SAVE_DRAFT 保持 CLAIMED")
    void wbAssign003_saveDraftKeepsClaimed() {
        AssignmentEntity entity = claimed(3L, 42L);
        when(assignmentMapper.selectById(3L)).thenReturn(entity);
        when(assignmentStateMachineService.transition(3L, AssignmentEvent.SAVE_DRAFT))
                .thenReturn(AssignmentStatus.CLAIMED);
        when(summaryAssembler.assemble(any(AssignmentEntity.class))).thenReturn(summaryFor(entity));

        assignmentService.saveDraft(3L, Map.of("note", "draft"));

        verify(assignmentStateMachineService).transition(3L, AssignmentEvent.SAVE_DRAFT);
    }

    @Test
    @DisplayName("WB-ASSIGN-004: CLAIMED + SUBMIT → SUBMITTED")
    void wbAssign004_submitTransitionsToSubmitted() {
        AssignmentEntity entity = claimed(4L, 42L);
        when(assignmentMapper.selectById(4L)).thenReturn(entity);
        when(assignmentStateMachineService.transition(4L, AssignmentEvent.SUBMIT))
                .thenReturn(AssignmentStatus.SUBMITTED);
        when(summaryAssembler.assemble(any(AssignmentEntity.class))).thenReturn(summaryFor(entity));

        assignmentService.submitAssignment(4L);

        verify(assignmentStateMachineService).transition(4L, AssignmentEvent.SUBMIT);
    }

    @Test
    @DisplayName("WB-ASSIGN-005: SUBMITTED + WITHDRAW_SUBMISSION → CLAIMED")
    void wbAssign005_withdrawSubmissionReopensClaimed() {
        AssignmentEntity entity = submitted(5L);
        when(assignmentMapper.selectById(5L)).thenReturn(entity);

        AssignmentStatus next = stateMachineService.transition(5L, AssignmentEvent.WITHDRAW_SUBMISSION);

        assertThat(next).isEqualTo(AssignmentStatus.CLAIMED);
        verify(assignmentMapper).updateById(entity);
    }

    @Test
    @DisplayName("WB-ASSIGN-006: CLAIMED + EXPIRE → EXPIRED")
    void wbAssign006_expireFromClaimed() {
        AssignmentEntity entity = claimed(6L, 42L);
        when(assignmentMapper.selectById(6L)).thenReturn(entity);

        AssignmentStatus next = stateMachineService.transition(6L, AssignmentEvent.EXPIRE);

        assertThat(next).isEqualTo(AssignmentStatus.EXPIRED);
    }

    @Test
    @DisplayName("WB-ASSIGN-007: EXPIRED + REOPEN → UNCLAIMED")
    void wbAssign007_reopenFromExpired() {
        AssignmentEntity entity = expired(7L);
        when(assignmentMapper.selectById(7L)).thenReturn(entity);
        when(assignmentStateMachineService.canTransition(7L, AssignmentEvent.REOPEN)).thenReturn(true);
        when(assignmentStateMachineService.transition(7L, AssignmentEvent.REOPEN))
                .thenReturn(AssignmentStatus.UNCLAIMED);
        when(summaryAssembler.assemble(any(AssignmentEntity.class))).thenReturn(summaryFor(entity));

        assignmentService.reopenAssignment(7L);

        verify(assignmentStateMachineService).transition(7L, AssignmentEvent.REOPEN);
    }

    @Test
    @DisplayName("WB-ASSIGN-008: SUBMITTED + REOPEN（非法）→ TRANSITION_INVALID")
    void wbAssign008_reopenFromSubmittedRejected() {
        AssignmentEntity entity = submitted(808L);
        when(assignmentMapper.selectById(808L)).thenReturn(entity);

        assertThatThrownBy(() -> stateMachineService.transition(808L, AssignmentEvent.REOPEN))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).errorCode())
                .isEqualTo(ErrorCode.TRANSITION_INVALID);
    }

    @Test
    @DisplayName("WB-ASSIGN-009: 已被他人领取时 claim 失败")
    void wbAssign009_claimRejectedWhenAlreadyClaimed() {
        AssignmentEntity entity = claimedByOther(8L, 999L);
        when(assignmentMapper.selectById(8L)).thenReturn(entity);
        when(assignmentStateMachineService.transition(8L, AssignmentEvent.CLAIM))
                .thenThrow(new BusinessException(ErrorCode.TRANSITION_INVALID, "已被领取"));

        assertThatThrownBy(() -> assignmentService.claimAssignment(8L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("WB-ASSIGN-010: 非法状态转移被拒绝")
    void wbAssign010_invalidTransitionRejected() {
        AssignmentEntity entity = submitted(10L);
        when(assignmentMapper.selectById(10L)).thenReturn(entity);

        assertThatThrownBy(() -> assignmentService.reopenAssignment(10L))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).errorCode())
                .isEqualTo(ErrorCode.OPERATION_NOT_ALLOWED);
    }

    private AssignmentEntity unclaimed(Long id) {
        AssignmentEntity e = new AssignmentEntity();
        e.setId(id);
        e.setDeletedFlag(0);
        e.setStatus(AssignmentStatus.UNCLAIMED.name());
        return e;
    }

    private AssignmentEntity claimed(Long id, Long labelerId) {
        AssignmentEntity e = unclaimed(id);
        e.setStatus(AssignmentStatus.CLAIMED.name());
        e.setLabelerId(labelerId);
        return e;
    }

    private AssignmentEntity submitted(Long id) {
        AssignmentEntity e = claimed(id, 42L);
        e.setStatus(AssignmentStatus.SUBMITTED.name());
        return e;
    }

    private AssignmentEntity expired(Long id) {
        AssignmentEntity e = unclaimed(id);
        e.setStatus(AssignmentStatus.EXPIRED.name());
        return e;
    }

    private AssignmentEntity claimedByOther(Long id, Long assigneeId) {
        AssignmentEntity e = unclaimed(id);
        e.setStatus(AssignmentStatus.CLAIMED.name());
        e.setLabelerId(assigneeId);
        return e;
    }

    private AssignmentSummary summaryFor(AssignmentEntity entity) {
        return new AssignmentSummary(
                entity.getId(),
                entity.getTaskId(),
                entity.getItemId(),
                1,
                entity.getLabelerId(),
                null,
                entity.getAssignType(),
                entity.getStatus(),
                null,
                null,
                null,
                null,
                null,
                entity.getAssignedAt(),
                entity.getClaimedAt(),
                entity.getDeadlineAt(),
                entity.getCreatedAt());
    }
}
