package com.labelhub.infra.statemachine;

import com.labelhub.core.statemachine.StateMachineEngine;

/**
 * 任务分配状态机工厂
 * 
 * <p>
 * 定义任务分配生命周期的状态转换规则：
 * <ul>
 * <li>UNCLAIMED（未领取）→ CLAIM → CLAIMED（已领取）</li>
 * <li>UNCLAIMED（未领取）→ CANCEL → CANCELLED（已取消）</li>
 * <li>CLAIMED（已领取）→ SAVE_DRAFT → CLAIMED（保持已领取）</li>
 * <li>CLAIMED（已领取）→ SUBMIT → SUBMITTED（已提交）</li>
 * <li>SUBMITTED（已提交）→ WITHDRAW_SUBMISSION → CLAIMED（撤回/打回/申诉通过后继续标注，保留标注员）</li>
 * <li>CLAIMED（已领取）→ EXPIRE → EXPIRED（已过期）</li>
 * <li>CLAIMED（已领取）→ CANCEL → CANCELLED（已取消）</li>
 * <li>EXPIRED（已过期）→ REOPEN → UNCLAIMED（管理员重新打开槽位）</li>
 * <li>CANCELLED（已取消）→ REOPEN → UNCLAIMED（管理员重新打开槽位）</li>
 * </ul>
 */
public final class AssignmentStateMachineFactory {
    private AssignmentStateMachineFactory() {
    }

    /**
     * 创建任务分配状态机实例
     * 
     * @return 任务分配状态机引擎
     */
    public static StateMachineEngine<AssignmentStatus, AssignmentEvent> createAssignmentMachine() {
        return StateMachineEngine.<AssignmentStatus, AssignmentEvent>builder("ASSIGNMENT_MACHINE")
                .addTransition(AssignmentStatus.UNCLAIMED, AssignmentEvent.CLAIM, AssignmentStatus.CLAIMED)
                .addTransition(AssignmentStatus.UNCLAIMED, AssignmentEvent.CANCEL, AssignmentStatus.CANCELLED)
                .addTransition(AssignmentStatus.CLAIMED, AssignmentEvent.SAVE_DRAFT, AssignmentStatus.CLAIMED)
                .addTransition(AssignmentStatus.CLAIMED, AssignmentEvent.SUBMIT, AssignmentStatus.SUBMITTED)
                .addTransition(AssignmentStatus.SUBMITTED, AssignmentEvent.WITHDRAW_SUBMISSION, AssignmentStatus.CLAIMED)
                .addTransition(AssignmentStatus.CLAIMED, AssignmentEvent.EXPIRE, AssignmentStatus.EXPIRED)
                .addTransition(AssignmentStatus.CLAIMED, AssignmentEvent.CANCEL, AssignmentStatus.CANCELLED)
                .addTransition(AssignmentStatus.EXPIRED, AssignmentEvent.REOPEN, AssignmentStatus.UNCLAIMED)
                .addTransition(AssignmentStatus.CANCELLED, AssignmentEvent.REOPEN, AssignmentStatus.UNCLAIMED)
                .build();
    }
}
