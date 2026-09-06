package com.labelhub.infra.statemachine;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.statemachine.StateMachineEngine;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SubmissionStateMachineTest {

    @Test
    void basicMachine_canTransitFullNormalFlow() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        assertEquals(SubmissionStatus.SUBMITTED, machine.fire(SubmissionStatus.DRAFT, SubmissionEvent.SUBMIT));
        assertEquals(SubmissionStatus.AI_REVIEWING, machine.fire(SubmissionStatus.SUBMITTED, SubmissionEvent.ENTER_AI_REVIEW));
        assertEquals(SubmissionStatus.AI_PASSED, machine.fire(SubmissionStatus.AI_REVIEWING, SubmissionEvent.AI_PASS));
        assertEquals(SubmissionStatus.HUMAN_REVIEWING, machine.fire(SubmissionStatus.AI_PASSED, SubmissionEvent.ENTER_HUMAN_REVIEW));
        assertEquals(SubmissionStatus.APPROVED, machine.fire(SubmissionStatus.HUMAN_REVIEWING, SubmissionEvent.APPROVE));
    }

    @Test
    void basicMachine_canTransitAiRejectFlow() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        SubmissionStatus status = SubmissionStatus.DRAFT;
        status = machine.fire(status, SubmissionEvent.SUBMIT);
        status = machine.fire(status, SubmissionEvent.ENTER_AI_REVIEW);
        status = machine.fire(status, SubmissionEvent.AI_REJECT);
        status = machine.fire(status, SubmissionEvent.RETURN_FOR_REVISION);
        assertEquals(SubmissionStatus.NEEDS_REVISION, status);
        status = machine.fire(status, SubmissionEvent.RESUBMIT_AFTER_REVISION);
        assertEquals(SubmissionStatus.SUBMITTED, status);
    }

    @Test
    void basicMachine_canTransitHumanReviewRejectToRevision() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        SubmissionStatus status = SubmissionStatus.HUMAN_REVIEWING;
        status = machine.fire(status, SubmissionEvent.RETURN_FOR_REVISION);
        assertEquals(SubmissionStatus.NEEDS_REVISION, status);
    }

    @Test
    void basicMachine_canTransitAiRequireHuman() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();
        assertEquals(SubmissionStatus.HUMAN_REVIEWING, machine.fire(SubmissionStatus.AI_REVIEWING, SubmissionEvent.AI_REQUIRE_HUMAN));
    }

    @Test
    void basicMachine_cannotFireInvalidTransition() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        BusinessException ex = assertThrows(BusinessException.class, () -> {
            machine.fire(SubmissionStatus.DRAFT, SubmissionEvent.APPROVE);
        });
        assertEquals(ErrorCode.TRANSITION_INVALID, ex.errorCode());
    }

    @Test
    void basicMachine_canCheckCanTransition() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        assertTrue(machine.canTransition(SubmissionStatus.DRAFT, SubmissionEvent.SUBMIT));
        assertFalse(machine.canTransition(SubmissionStatus.DRAFT, SubmissionEvent.APPROVE));
    }

    @Test
    void standardMachine_supportsHumanRejectAppealFlow() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        SubmissionStatus status = SubmissionStatus.HUMAN_REVIEWING;
        status = machine.fire(status, SubmissionEvent.REJECT);
        assertEquals(SubmissionStatus.REJECTED, status);

        status = machine.fire(status, SubmissionEvent.SUBMIT_APPEAL);
        assertEquals(SubmissionStatus.APPEALING_HUMAN, status);

        status = machine.fire(status, SubmissionEvent.APPEAL_APPROVE);
        assertEquals(SubmissionStatus.APPEAL_APPROVED_SKIP_HUMAN, status);

        status = machine.fire(status, SubmissionEvent.RESUBMIT_AFTER_HUMAN_APPEAL);
        assertEquals(SubmissionStatus.SUBMITTED_APPEAL_HUMAN, status);

        status = machine.fire(status, SubmissionEvent.ENTER_AI_REVIEW_APPEAL_HUMAN);
        assertEquals(SubmissionStatus.AI_REVIEWING_APPEAL_HUMAN, status);

        status = machine.fire(status, SubmissionEvent.AI_PASS_APPEAL_HUMAN);
        assertEquals(SubmissionStatus.APPROVED, status);
    }

    @Test
    void standardMachine_supportsAppealApprovedResubmitAfterAiRejectToHumanReview() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        SubmissionStatus status = SubmissionStatus.AI_REJECTED;
        status = machine.fire(status, SubmissionEvent.SUBMIT_APPEAL);
        assertEquals(SubmissionStatus.APPEALING_AI, status);

        status = machine.fire(status, SubmissionEvent.APPEAL_APPROVE);
        assertEquals(SubmissionStatus.APPEAL_APPROVED_SKIP_AI, status);

        status = machine.fire(status, SubmissionEvent.RESUBMIT_AFTER_AI_APPEAL);
        assertEquals(SubmissionStatus.HUMAN_REVIEWING, status);
    }

    @Test
    void standardMachine_supportsAppealFromAiRejected() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        SubmissionStatus status = SubmissionStatus.DRAFT;
        status = machine.fire(status, SubmissionEvent.SUBMIT);
        status = machine.fire(status, SubmissionEvent.ENTER_AI_REVIEW);
        status = machine.fire(status, SubmissionEvent.AI_REJECT);
        assertEquals(SubmissionStatus.AI_REJECTED, status);

        status = machine.fire(status, SubmissionEvent.SUBMIT_APPEAL);
        assertEquals(SubmissionStatus.APPEALING_AI, status);
    }

    @Test
    void standardMachine_supportsAppealRejectReturnsToOriginalRejectStatus() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        SubmissionStatus status = SubmissionStatus.REJECTED;
        status = machine.fire(status, SubmissionEvent.SUBMIT_APPEAL);
        assertEquals(SubmissionStatus.APPEALING_HUMAN, status);
        status = machine.fire(status, SubmissionEvent.APPEAL_REJECT);
        assertEquals(SubmissionStatus.REJECTED, status);

        status = SubmissionStatus.AI_REJECTED;
        status = machine.fire(status, SubmissionEvent.SUBMIT_APPEAL);
        assertEquals(SubmissionStatus.APPEALING_AI, status);
        status = machine.fire(status, SubmissionEvent.APPEAL_REJECT);
        assertEquals(SubmissionStatus.AI_REJECTED, status);
    }

    @Test
    void standardMachine_basicTransitionsStillWork() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();

        SubmissionStatus status = SubmissionStatus.DRAFT;
        status = machine.fire(status, SubmissionEvent.SUBMIT);
        status = machine.fire(status, SubmissionEvent.ENTER_AI_REVIEW);
        status = machine.fire(status, SubmissionEvent.AI_PASS);
        status = machine.fire(status, SubmissionEvent.ENTER_HUMAN_REVIEW);
        status = machine.fire(status, SubmissionEvent.APPROVE);
        assertEquals(SubmissionStatus.APPROVED, status);
    }

    @Test
    void standardMachine_supportsWithdrawTransition() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();
        assertTrue(machine.canTransition(SubmissionStatus.SUBMITTED, SubmissionEvent.WITHDRAW));
        assertEquals(SubmissionStatus.DRAFT, machine.fire(SubmissionStatus.AI_PASSED, SubmissionEvent.WITHDRAW));
    }

    @Test
    void testGetAvailableEvents() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();
        var events = machine.getAvailableEvents(SubmissionStatus.DRAFT);
        assertEquals(1, events.size());
        assertTrue(events.contains(SubmissionEvent.SUBMIT));
    }

    @Test
    void testGetMachineName() {
        StateMachineEngine<SubmissionStatus, SubmissionEvent> machine = SubmissionStateMachineFactory.createStandardMachine();
        assertEquals("STANDARD_SUBMISSION", machine.getMachineName());
    }
}
