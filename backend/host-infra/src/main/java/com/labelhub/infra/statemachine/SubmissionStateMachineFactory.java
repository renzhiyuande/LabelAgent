package com.labelhub.infra.statemachine;

import com.labelhub.core.statemachine.StateMachineEngine;

/**
 * 提交状态机工厂
 *
 * <p>定义标注提交的标准审核流程状态转换规则，并预留撤回与申诉边。
 * 申诉按来源拆分为显式状态，改稿后再提交时由当前状态决定事件，无需查库推断来源。
 */
public final class SubmissionStateMachineFactory {
    private SubmissionStateMachineFactory() {
    }

    public static StateMachineEngine<SubmissionStatus, SubmissionEvent> createStandardMachine() {
        return StateMachineEngine.<SubmissionStatus, SubmissionEvent>builder("STANDARD_SUBMISSION")
            .addTransition(SubmissionStatus.DRAFT, SubmissionEvent.SUBMIT, SubmissionStatus.SUBMITTED)
            .addTransition(SubmissionStatus.SUBMITTED, SubmissionEvent.WITHDRAW, SubmissionStatus.DRAFT)
            .addTransition(SubmissionStatus.AI_REVIEWING, SubmissionEvent.WITHDRAW, SubmissionStatus.DRAFT)
            .addTransition(SubmissionStatus.AI_PASSED, SubmissionEvent.WITHDRAW, SubmissionStatus.DRAFT)
            .addTransition(SubmissionStatus.SUBMITTED, SubmissionEvent.ENTER_AI_REVIEW, SubmissionStatus.AI_REVIEWING)
            .addTransition(SubmissionStatus.AI_REVIEWING, SubmissionEvent.AI_PASS, SubmissionStatus.AI_PASSED)
            .addTransition(SubmissionStatus.AI_REVIEWING, SubmissionEvent.AI_REJECT, SubmissionStatus.AI_REJECTED)
            .addTransition(SubmissionStatus.AI_REVIEWING, SubmissionEvent.AI_REQUIRE_HUMAN, SubmissionStatus.HUMAN_REVIEWING)
            .addTransition(SubmissionStatus.AI_PASSED, SubmissionEvent.ENTER_HUMAN_REVIEW, SubmissionStatus.HUMAN_REVIEWING)
            .addTransition(SubmissionStatus.AI_REJECTED, SubmissionEvent.RETURN_FOR_REVISION, SubmissionStatus.NEEDS_REVISION)
            .addTransition(SubmissionStatus.AI_REJECTED, SubmissionEvent.SUBMIT_APPEAL, SubmissionStatus.APPEALING_AI)
            .addTransition(SubmissionStatus.HUMAN_REVIEWING, SubmissionEvent.APPROVE, SubmissionStatus.APPROVED)
            .addTransition(SubmissionStatus.HUMAN_REVIEWING, SubmissionEvent.REJECT, SubmissionStatus.REJECTED)
            .addTransition(SubmissionStatus.HUMAN_REVIEWING, SubmissionEvent.RETURN_FOR_REVISION, SubmissionStatus.NEEDS_REVISION)
            .addTransition(SubmissionStatus.NEEDS_REVISION, SubmissionEvent.RESUBMIT_AFTER_REVISION, SubmissionStatus.SUBMITTED)
            .addTransition(SubmissionStatus.REJECTED, SubmissionEvent.SUBMIT_APPEAL, SubmissionStatus.APPEALING_HUMAN)
            .addTransition(SubmissionStatus.APPEALING_AI, SubmissionEvent.APPEAL_APPROVE, SubmissionStatus.APPEAL_APPROVED_SKIP_AI)
            .addTransition(SubmissionStatus.APPEALING_AI, SubmissionEvent.APPEAL_REJECT, SubmissionStatus.AI_REJECTED)
            .addTransition(SubmissionStatus.APPEALING_HUMAN, SubmissionEvent.APPEAL_APPROVE, SubmissionStatus.APPEAL_APPROVED_SKIP_HUMAN)
            .addTransition(SubmissionStatus.APPEALING_HUMAN, SubmissionEvent.APPEAL_REJECT, SubmissionStatus.REJECTED)
            .addTransition(SubmissionStatus.APPEAL_APPROVED_SKIP_AI, SubmissionEvent.RESUBMIT_AFTER_AI_APPEAL, SubmissionStatus.HUMAN_REVIEWING)
            .addTransition(SubmissionStatus.APPEAL_APPROVED_SKIP_HUMAN, SubmissionEvent.RESUBMIT_AFTER_HUMAN_APPEAL, SubmissionStatus.SUBMITTED_APPEAL_HUMAN)
            .addTransition(SubmissionStatus.SUBMITTED_APPEAL_HUMAN, SubmissionEvent.ENTER_AI_REVIEW_APPEAL_HUMAN, SubmissionStatus.AI_REVIEWING_APPEAL_HUMAN)
            .addTransition(SubmissionStatus.AI_REVIEWING_APPEAL_HUMAN, SubmissionEvent.AI_PASS_APPEAL_HUMAN, SubmissionStatus.APPROVED)
            .addTransition(SubmissionStatus.AI_REVIEWING_APPEAL_HUMAN, SubmissionEvent.AI_REJECT, SubmissionStatus.AI_REJECTED)
            .build();
    }
}
