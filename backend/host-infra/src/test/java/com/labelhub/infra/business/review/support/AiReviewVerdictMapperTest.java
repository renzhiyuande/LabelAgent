package com.labelhub.infra.business.review.support;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import org.junit.jupiter.api.Test;

class AiReviewVerdictMapperTest {
    @Test
    void mapsStandardVerdictsDuringAiReviewing() {
        String status = SubmissionStatus.AI_REVIEWING.name();
        assertEquals(SubmissionEvent.AI_PASS, AiReviewVerdictMapper.toEvent("PASS", status));
        assertEquals(SubmissionEvent.AI_REJECT, AiReviewVerdictMapper.toEvent("reject", status));
        assertEquals(SubmissionEvent.AI_REQUIRE_HUMAN, AiReviewVerdictMapper.toEvent("REQUIRE_HUMAN", status));
        assertEquals(SubmissionEvent.AI_REQUIRE_HUMAN, AiReviewVerdictMapper.toEvent(null, status));
    }

    @Test
    void mapsAppealHumanBranch() {
        String status = SubmissionStatus.AI_REVIEWING_APPEAL_HUMAN.name();
        assertEquals(SubmissionEvent.AI_PASS_APPEAL_HUMAN, AiReviewVerdictMapper.toEvent("PASS", status));
        assertEquals(SubmissionEvent.AI_REJECT, AiReviewVerdictMapper.toEvent("REJECT", status));
        assertEquals(SubmissionEvent.AI_PASS_APPEAL_HUMAN, AiReviewVerdictMapper.toEvent("REQUIRE_HUMAN", status));
    }
}
