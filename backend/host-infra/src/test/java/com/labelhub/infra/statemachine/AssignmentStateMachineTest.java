package com.labelhub.infra.statemachine;

import com.labelhub.core.statemachine.StateMachineEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Assignment 状态机单元测试")
class AssignmentStateMachineTest {
    private StateMachineEngine<AssignmentStatus, AssignmentEvent> machine;

    @BeforeEach
    void setUp() {
        machine = AssignmentStateMachineFactory.createAssignmentMachine();
    }

    @Test
    @DisplayName("UNCLAIMED 状态 - 触发 CLAIM 事件成功流转到 CLAIMED")
    void testUnclaimedToClaimed() {
        AssignmentStatus next = machine.fire(AssignmentStatus.UNCLAIMED, AssignmentEvent.CLAIM);
        assertEquals(AssignmentStatus.CLAIMED, next);
    }

    @Test
    @DisplayName("UNCLAIMED 状态 - 触发 CANCEL 事件成功流转到 CANCELLED")
    void testUnclaimedToCancelled() {
        AssignmentStatus next = machine.fire(AssignmentStatus.UNCLAIMED, AssignmentEvent.CANCEL);
        assertEquals(AssignmentStatus.CANCELLED, next);
    }

    @Test
    @DisplayName("CLAIMED 状态 - 触发 SAVE_DRAFT 事件保留在 CLAIMED（原地保存）")
    void testClaimedSaveDraft() {
        AssignmentStatus next = machine.fire(AssignmentStatus.CLAIMED, AssignmentEvent.SAVE_DRAFT);
        assertEquals(AssignmentStatus.CLAIMED, next);
    }

    @Test
    @DisplayName("CLAIMED 状态 - 触发 SUBMIT 事件流转到 SUBMITTED")
    void testClaimedToSubmitted() {
        AssignmentStatus next = machine.fire(AssignmentStatus.CLAIMED, AssignmentEvent.SUBMIT);
        assertEquals(AssignmentStatus.SUBMITTED, next);
    }

    @Test
    @DisplayName("CLAIMED 状态 - 触发 EXPIRE 事件流转到 EXPIRED")
    void testClaimedToExpired() {
        AssignmentStatus next = machine.fire(AssignmentStatus.CLAIMED, AssignmentEvent.EXPIRE);
        assertEquals(AssignmentStatus.EXPIRED, next);
    }

    @Test
    @DisplayName("CLAIMED 状态 - 触发 CANCEL 事件流转到 CANCELLED")
    void testClaimedToCancelled() {
        AssignmentStatus next = machine.fire(AssignmentStatus.CLAIMED, AssignmentEvent.CANCEL);
        assertEquals(AssignmentStatus.CANCELLED, next);
    }

    @Test
    @DisplayName("SUBMITTED 状态 - 不允许 REOPEN，应使用 WITHDRAW_SUBMISSION")
    void testSubmittedCannotReopen() {
        assertFalse(machine.canTransition(AssignmentStatus.SUBMITTED, AssignmentEvent.REOPEN));
    }

    @Test
    @DisplayName("SUBMITTED 状态 - 触发 WITHDRAW_SUBMISSION 事件流转到 CLAIMED")
    void testSubmittedWithdrawSubmissionToClaimed() {
        AssignmentStatus next = machine.fire(AssignmentStatus.SUBMITTED, AssignmentEvent.WITHDRAW_SUBMISSION);
        assertEquals(AssignmentStatus.CLAIMED, next);
    }

    @Test
    @DisplayName("EXPIRED 状态 - 触发 REOPEN 事件流转到 UNCLAIMED")
    void testExpiredReopenToUnclaimed() {
        AssignmentStatus next = machine.fire(AssignmentStatus.EXPIRED, AssignmentEvent.REOPEN);
        assertEquals(AssignmentStatus.UNCLAIMED, next);
    }

    @Test
    @DisplayName("CANCELLED 状态 - 触发 REOPEN 事件流转到 UNCLAIMED")
    void testCancelledReopenToUnclaimed() {
        AssignmentStatus next = machine.fire(AssignmentStatus.CANCELLED, AssignmentEvent.REOPEN);
        assertEquals(AssignmentStatus.UNCLAIMED, next);
    }

    @Test
    @DisplayName("非法状态转移校验 - UNCLAIMED 直接 SUBMIT 应失败")
    void testInvalidTransitionUnclaimedSubmit() {
        assertFalse(machine.canTransition(AssignmentStatus.UNCLAIMED, AssignmentEvent.SUBMIT));
    }

    @Test
    @DisplayName("非法状态转移校验 - SUBMITTED 直接 CLAIM 应失败")
    void testInvalidTransitionSubmittedClaim() {
        assertFalse(machine.canTransition(AssignmentStatus.SUBMITTED, AssignmentEvent.CLAIM));
    }
}
