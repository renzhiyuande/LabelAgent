package com.labelhub.infra.business.review.support;

import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import org.springframework.util.StringUtils;

/** AI 预审 verdict 字符串 → 状态机事件映射。 */
public final class AiReviewVerdictMapper {
    private AiReviewVerdictMapper() {
    }

    public static SubmissionEvent toEvent(String verdict, String currentStatus) {
        if (SubmissionStatus.AI_REVIEWING_APPEAL_HUMAN.name().equals(currentStatus)) {
            if (!StringUtils.hasText(verdict)) {
                return SubmissionEvent.AI_PASS_APPEAL_HUMAN;
            }
            return switch (verdict.toUpperCase()) {
                case "REJECT" -> SubmissionEvent.AI_REJECT;
                default -> SubmissionEvent.AI_PASS_APPEAL_HUMAN;
            };
        }
        if (!StringUtils.hasText(verdict)) {
            return SubmissionEvent.AI_REQUIRE_HUMAN;
        }
        return switch (verdict.toUpperCase()) {
            case "PASS" -> SubmissionEvent.AI_PASS;
            case "REJECT" -> SubmissionEvent.AI_REJECT;
            default -> SubmissionEvent.AI_REQUIRE_HUMAN;
        };
    }
}
