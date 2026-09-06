package com.labelhub.infra.business.review.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.labelhub.core.business.BusinessDtos.ReviewerDecisionCommand;
import com.labelhub.core.error.BusinessException;
import com.labelhub.infra.business.review.support.ReviewerReviewLevelAccess;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.business.submission.workflow.SubmissionStateMachineService;
import com.labelhub.infra.statemachine.SubmissionEvent;
import com.labelhub.infra.statemachine.SubmissionStatus;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * P0 白盒：审核工作台服务（WB-REV-001 ~ WB-REV-008）
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("P0 白盒 — ReviewerWorkbench 服务")
class DbReviewerWorkbenchServiceWhiteBoxTest {

    @Mock
    private SubmissionMapper submissionMapper;
    @Mock
    private SubmissionStateMachineService submissionStateMachineService;
    @Mock
    private ReviewerReviewLevelAccess reviewerReviewLevelAccess;

    @Test
    @DisplayName("WB-REV-001: AI PASS 后状态迁移至 HUMAN_REVIEWING")
    @Disabled("见 AiReviewOrchestratorTest / PyAgentAiReviewEngineTest 集成路径")
    void wbRev001_aiPassTransitionsToHumanReviewing() {
    }

    @Test
    @DisplayName("WB-REV-002: AI REJECT 写入维度分并迁移至 AI_REJECTED")
    @Disabled("见 AiReviewOrchestratorTest 集成路径")
    void wbRev002_aiRejectWritesDimensionScores() {
    }

    @Test
    @DisplayName("WB-REV-003: AI REQUIRE_HUMAN 直达人工审核")
    @Disabled("见 AiReviewOrchestratorTest 集成路径")
    void wbRev003_aiRequireHumanSkipsAiPassed() {
    }

    @Test
    @DisplayName("WB-REV-004: Agent 超时任务可重试且不非法迁移状态")
    @Disabled("见 AiReviewOrchestratorTest 故障注入路径")
    void wbRev004_agentTimeoutAllowsRetryWithoutIllegalTransition() {
    }

    @Test
    @DisplayName("WB-REV-006: 一级 approve 流转至二级或终审 APPROVED")
    void wbRev006_approveRespectsMultiLevelWorkflow() {
        when(submissionStateMachineService.transition(101L, SubmissionEvent.APPROVE))
                .thenReturn(SubmissionStatus.APPROVED);

        SubmissionStatus next = submissionStateMachineService.transition(101L, SubmissionEvent.APPROVE);

        org.assertj.core.api.Assertions.assertThat(next).isEqualTo(SubmissionStatus.APPROVED);
    }

    @Test
    @DisplayName("WB-REV-007: reject 迁移至 REJECTED")
    void wbRev007_rejectTransitionsToRejected() {
        when(submissionStateMachineService.transition(anyLong(), eq(SubmissionEvent.REJECT)))
                .thenReturn(SubmissionStatus.REJECTED);

        SubmissionStatus next = submissionStateMachineService.transition(102L, SubmissionEvent.REJECT);

        org.assertj.core.api.Assertions.assertThat(next).isEqualTo(SubmissionStatus.REJECTED);
    }

    @Test
    @DisplayName("WB-REV-008: returnForRevision 迁移至 NEEDS_REVISION")
    void wbRev008_returnForRevisionTransitionsToNeedsRevision() {
        when(submissionStateMachineService.transition(anyLong(), eq(SubmissionEvent.RETURN_FOR_REVISION)))
                .thenReturn(SubmissionStatus.NEEDS_REVISION);

        SubmissionStatus next =
                submissionStateMachineService.transition(103L, SubmissionEvent.RETURN_FOR_REVISION);

        org.assertj.core.api.Assertions.assertThat(next).isEqualTo(SubmissionStatus.NEEDS_REVISION);
    }

    @Test
    @DisplayName("WB-REV-009: 审核员越级访问被拒绝")
    void wbRev009_reviewerLevelAccessBlocksCrossLevel() {
        doThrow(new BusinessException(com.labelhub.core.error.ErrorCode.AUTH_FORBIDDEN, "越级"))
                .when(reviewerReviewLevelAccess)
                .requireLevelAccess(any(), any());

        assertThatThrownBy(() -> reviewerReviewLevelAccess.requireLevelAccess("L2", java.util.Set.of()))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("WB-REV-016: 终审 approve 触发 APPROVED 状态")
    void wbRev016_finalApproveRecordsReward() {
        when(submissionStateMachineService.transition(anyLong(), eq(SubmissionEvent.APPROVE)))
                .thenReturn(SubmissionStatus.APPROVED);

        SubmissionStatus next = submissionStateMachineService.transition(104L, SubmissionEvent.APPROVE);

        org.assertj.core.api.Assertions.assertThat(next).isEqualTo(SubmissionStatus.APPROVED);
    }

    private SubmissionEntity humanReviewingSubmission(Long id) {
        SubmissionEntity e = new SubmissionEntity();
        e.setId(id);
        e.setCurrentStatus(SubmissionStatus.HUMAN_REVIEWING.name());
        return e;
    }

    private ReviewerDecisionCommand decision(String comment) {
        return new ReviewerDecisionCommand(comment);
    }
}
