package com.labelhub.infra.business.submission.workflow;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.statemachine.SubmissionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SubmissionTransitionPolicyTest {

    private SubmissionTransitionPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new SubmissionTransitionPolicy(new ObjectMapper(), null);
    }

    @Test
    void canAppealWhenAiRejectedAndAppealEnabledOnTask() {
        TaskEntity task = new TaskEntity();
        task.setSettingsJson("""
                {"submission":{"appeal":{"enabled":true,"maxAppealsPerSubmission":1,"appealWindowHours":72}}}
                """);

        SubmissionEntity submission = new SubmissionEntity();
        submission.setCurrentStatus(SubmissionStatus.AI_REJECTED.name());
        submission.setAppealCount(0);
        submission.setLastActionAt(java.time.Instant.now());

        assertThat(policy.canAppeal(submission, task)).isTrue();
    }

    @Test
    void canAppealWhenHumanRejectedAndAppealEnabledOnTask() {
        TaskEntity task = new TaskEntity();
        task.setSettingsJson("""
                {"submission":{"appeal":{"enabled":true,"maxAppealsPerSubmission":1,"appealWindowHours":72}}}
                """);

        SubmissionEntity submission = new SubmissionEntity();
        submission.setCurrentStatus(SubmissionStatus.REJECTED.name());
        submission.setAppealCount(0);
        submission.setLastActionAt(java.time.Instant.now());

        assertThat(policy.canAppeal(submission, task)).isTrue();
    }

    @Test
    void cannotAppealWhenStatusIsNotRejectLike() {
        TaskEntity task = new TaskEntity();
        task.setSettingsJson("""
                {"submission":{"appeal":{"enabled":true,"maxAppealsPerSubmission":1,"appealWindowHours":72}}}
                """);

        SubmissionEntity submission = new SubmissionEntity();
        submission.setCurrentStatus(SubmissionStatus.APPROVED.name());

        assertThat(policy.canAppeal(submission, task)).isFalse();
        assertThat(policy.appealBlockReason(submission, task)).isEqualTo("APPEAL_STATUS_NOT_ALLOWED");
    }
}
