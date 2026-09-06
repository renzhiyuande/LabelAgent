package com.labelhub.infra.statemachine;

public enum SubmissionEvent {
    SUBMIT,
    WITHDRAW,
    ENTER_AI_REVIEW,
    AI_PASS,
    AI_REJECT,
    AI_REQUIRE_HUMAN,
    ENTER_HUMAN_REVIEW,
    APPROVE,
    REJECT,
    RETURN_FOR_REVISION,
    RESUBMIT_AFTER_REVISION,
    /** AI 驳回申诉通过后改稿提交，直接进入人工审核 */
    RESUBMIT_AFTER_AI_APPEAL,
    /** 人工终审驳回申诉通过后改稿提交 */
    RESUBMIT_AFTER_HUMAN_APPEAL,
    /** 人工终审申诉通过路径：进入 AI 审核 */
    ENTER_AI_REVIEW_APPEAL_HUMAN,
    /** 人工终审申诉通过路径：AI 通过后直接终态（跳过人工终审） */
    AI_PASS_APPEAL_HUMAN,
    SUBMIT_APPEAL,
    APPEAL_APPROVE,
    APPEAL_REJECT
}
