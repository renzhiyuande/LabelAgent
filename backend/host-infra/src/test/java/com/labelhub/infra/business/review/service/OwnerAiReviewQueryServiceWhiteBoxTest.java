package com.labelhub.infra.business.review.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.review.AiReviewOwnerSummary;
import com.labelhub.infra.datapermission.DataPermissionRule;
import com.labelhub.infra.datapermission.DbDataPermissionService;
import com.labelhub.infra.datapermission.SqlPredicate;
import com.labelhub.infra.persistence.entity.AiReviewDimensionScoreEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewDimensionScoreMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.system.CurrentUserContext;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("P2 白盒 — OwnerAiReviewQueryService")
class OwnerAiReviewQueryServiceWhiteBoxTest {

    @Mock
    private AiReviewRecordMapper aiReviewRecordMapper;
    @Mock
    private AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper;
    @Mock
    private SubmissionMapper submissionMapper;
    @Mock
    private TaskMapper taskMapper;
    @Mock
    private DbDataPermissionService dataPermissionService;

    private OwnerAiReviewQueryService ownerService;
    private OwnerAiReviewQueryService labelerService;

    @BeforeEach
    void setUp() {
        ownerService = new OwnerAiReviewQueryService(
                aiReviewRecordMapper,
                aiReviewDimensionScoreMapper,
                submissionMapper,
                taskMapper,
                new CurrentUserContext(OwnerAiReviewQueryServiceWhiteBoxTest::ownerUser),
                OwnerAiReviewQueryServiceWhiteBoxTest::ownerUser,
                dataPermissionService);
        labelerService = new OwnerAiReviewQueryService(
                aiReviewRecordMapper,
                aiReviewDimensionScoreMapper,
                submissionMapper,
                taskMapper,
                new CurrentUserContext(OwnerAiReviewQueryServiceWhiteBoxTest::labelerUser),
                OwnerAiReviewQueryServiceWhiteBoxTest::labelerUser,
                dataPermissionService);
    }

    @Test
    @DisplayName("WB-AIR-001: owner task scope内可查看最新成功 AI 结果与维度分")
    void wbAir001_ownerCanReadAccessibleSuccessReview() {
        SubmissionEntity submission = submission(910238000001L, 910230000001L, 11001L);
        AiReviewRecordEntity record = reviewRecord("SUCCESS", "PASS", null);
        AiReviewDimensionScoreEntity dimension = dimensionScore();

        when(submissionMapper.selectById(submission.getId())).thenReturn(submission);
        when(dataPermissionService.buildRule(ownerUser().roles(), DataResourceType.TASK, ownerUser().userId()))
                .thenReturn(new DataPermissionRule(
                        DataResourceType.TASK,
                        ownerUser().roles(),
                        List.of(),
                        List.of(SqlPredicate.of("tasks.owner_id = ?", ownerUser().userId()))));
        when(taskMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);
        when(aiReviewRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(record);
        when(aiReviewDimensionScoreMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(dimension));

        AiReviewOwnerSummary summary = ownerService.queryLatestReviewForOwner(submission.getId());

        assertThat(summary).isNotNull();
        assertThat(summary.status()).isEqualTo("SUCCESS");
        assertThat(summary.verdict()).isEqualTo("PASS");
        assertThat(summary.failureReason()).isNull();
        assertThat(summary.dimensions()).hasSize(1);
        assertThat(summary.dimensions().getFirst().comment()).isEqualTo("标注判断与题面一致。");
    }

    @Test
    @DisplayName("WB-AIR-002: labeler 只能查看自己的提交，失败记录也会返回状态与原因")
    void wbAir002_labelerReadsOwnFailedReview() {
        SubmissionEntity submission = submission(910238000002L, 910230000001L, labelerUser().userId());
        AiReviewRecordEntity record = reviewRecord("FAILED", null, "agent timeout");

        when(submissionMapper.selectById(submission.getId())).thenReturn(submission);
        when(aiReviewRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(record);

        AiReviewOwnerSummary summary = labelerService.queryLatestReviewForLabeler(submission.getId());

        assertThat(summary).isNotNull();
        assertThat(summary.status()).isEqualTo("FAILED");
        assertThat(summary.failureReason()).isEqualTo("agent timeout");
        assertThat(summary.dimensions()).isEmpty();
        verify(aiReviewDimensionScoreMapper, never()).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("WB-AIR-003: owner 无任务范围时禁止查看他人任务提交")
    void wbAir003_ownerForbiddenWithoutTaskScope() {
        SubmissionEntity submission = submission(910238000003L, 910230000999L, 11001L);

        when(submissionMapper.selectById(submission.getId())).thenReturn(submission);
        when(dataPermissionService.buildRule(ownerUser().roles(), DataResourceType.TASK, ownerUser().userId()))
                .thenReturn(new DataPermissionRule(DataResourceType.TASK, ownerUser().roles(), List.of(), List.of()));

        assertThatThrownBy(() -> ownerService.queryLatestReviewForOwner(submission.getId()))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).errorCode()).isEqualTo(ErrorCode.AUTH_FORBIDDEN));
    }

    private static SubmissionEntity submission(Long id, Long taskId, Long labelerId) {
        SubmissionEntity entity = new SubmissionEntity();
        entity.setId(id);
        entity.setTaskId(taskId);
        entity.setLabelerId(labelerId);
        entity.setDeletedFlag(0);
        return entity;
    }

    private static AiReviewRecordEntity reviewRecord(String status, String verdict, String failureReason) {
        AiReviewRecordEntity entity = new AiReviewRecordEntity();
        entity.setId(920000000001L);
        entity.setStatus(status);
        entity.setVerdict(verdict);
        entity.setFailureReason(failureReason);
        entity.setTotalScore(new BigDecimal("92.5"));
        entity.setSummaryText("summary");
        entity.setModelId("deepseek-v4-flash");
        entity.setFinishedAt(Instant.parse("2026-06-08T10:00:00Z"));
        return entity;
    }

    private static AiReviewDimensionScoreEntity dimensionScore() {
        AiReviewDimensionScoreEntity entity = new AiReviewDimensionScoreEntity();
        entity.setAiReviewId(920000000001L);
        entity.setDimensionKey("accuracy");
        entity.setDimensionName("准确性");
        entity.setScore(new BigDecimal("95"));
        entity.setWeight(new BigDecimal("0.5"));
        entity.setVerdict("PASS");
        entity.setCommentText("标注判断与题面一致。");
        entity.setSortNo(1);
        entity.setDeletedFlag(0);
        return entity;
    }

    private static AuthenticatedUser ownerUser() {
        return new AuthenticatedUser(
                21001L,
                "owner_001",
                "Owner",
                Set.of("OWNER"),
                Set.of("business:submission:read"),
                List.of(),
                Set.of());
    }

    private static AuthenticatedUser labelerUser() {
        return new AuthenticatedUser(
                11001L,
                "labeler_001",
                "Labeler",
                Set.of("LABELER"),
                Set.of("business:labeler:workbench"),
                List.of(),
                Set.of());
    }
}
