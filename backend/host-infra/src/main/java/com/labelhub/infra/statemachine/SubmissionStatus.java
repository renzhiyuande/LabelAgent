package com.labelhub.infra.statemachine;

public enum SubmissionStatus {
    DRAFT,
    SUBMITTED,
    AI_REVIEWING,
    AI_PASSED,
    AI_REJECTED,
    HUMAN_REVIEWING,
    APPROVED,
    REJECTED,
    NEEDS_REVISION,
    /** AI 预审驳回后的申诉审理中 */
    APPEALING_AI,
    /** 人工终审驳回后的申诉审理中 */
    APPEALING_HUMAN,
    /** AI 驳回申诉通过，改稿后再提交将跳过 AI 预审 */
    APPEAL_APPROVED_SKIP_AI,
    /** 人工终审驳回申诉通过，改稿后再提交将跳过人工终审（仍走 AI） */
    APPEAL_APPROVED_SKIP_HUMAN,
    /** 人工终审申诉通过后已重新提交，待进入 AI 审核 */
    SUBMITTED_APPEAL_HUMAN,
    /** 人工终审申诉通过路径下的 AI 审核（通过后直接终态，不再进人工池） */
    AI_REVIEWING_APPEAL_HUMAN,
    /** 换标注员或取消分配后归档，仅供审计追溯 */
    ABANDONED;

    public static boolean allowsLabelerDraftEdit(String status) {
        if (status == null || status.isBlank()) {
            return false;
        }
        try {
            return switch (valueOf(status.trim())) {
                case DRAFT, NEEDS_REVISION, APPEAL_APPROVED_SKIP_AI, APPEAL_APPROVED_SKIP_HUMAN -> true;
                default -> false;
            };
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    public static boolean isAppealApprovedForResubmit(String status) {
        if (status == null || status.isBlank()) {
            return false;
        }
        try {
            SubmissionStatus parsed = valueOf(status.trim());
            return parsed == APPEAL_APPROVED_SKIP_AI || parsed == APPEAL_APPROVED_SKIP_HUMAN;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
