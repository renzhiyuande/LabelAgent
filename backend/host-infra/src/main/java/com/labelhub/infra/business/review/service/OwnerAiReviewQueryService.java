package com.labelhub.infra.business.review.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.review.AiReviewOwnerSummary;
import com.labelhub.infra.datapermission.DataPermissionRule;
import com.labelhub.infra.datapermission.DataScopeApplier;
import com.labelhub.infra.datapermission.DbDataPermissionService;
import com.labelhub.infra.datapermission.SqlPredicate;
import com.labelhub.infra.persistence.entity.AiReviewDimensionScoreEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.mapper.AiReviewDimensionScoreMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.system.CurrentUserContext;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerAiReviewQueryService {
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper;
    private final SubmissionMapper submissionMapper;
    private final TaskMapper taskMapper;
    private final CurrentUserContext currentUserContext;
    private final CurrentUserProvider currentUserProvider;
    private final DbDataPermissionService dataPermissionService;

    public OwnerAiReviewQueryService(
            AiReviewRecordMapper aiReviewRecordMapper,
            AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper,
            SubmissionMapper submissionMapper,
            TaskMapper taskMapper,
            CurrentUserContext currentUserContext,
            CurrentUserProvider currentUserProvider,
            DbDataPermissionService dataPermissionService) {
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.aiReviewDimensionScoreMapper = aiReviewDimensionScoreMapper;
        this.submissionMapper = submissionMapper;
        this.taskMapper = taskMapper;
        this.currentUserContext = currentUserContext;
        this.currentUserProvider = currentUserProvider;
        this.dataPermissionService = dataPermissionService;
    }

    @RequireAnyPermission({ "system:admin", "business:submission:read" })
    public AiReviewOwnerSummary queryLatestReviewForOwner(Long submissionId) {
        SubmissionEntity submission = requireSubmission(submissionId);
        if (!canAccessOwnerSubmission(submission)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
        return mapSummary(findLatestRecord(submission.getId()));
    }

    @RequireAnyPermission({ "system:admin", "business:labeler:workbench" })
    public AiReviewOwnerSummary queryLatestReviewForLabeler(Long submissionId) {
        SubmissionEntity submission = requireSubmission(submissionId);
        if (!canAccessLabelerSubmission(submission)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN);
        }
        return mapSummary(findLatestRecord(submission.getId()));
    }

    private AiReviewOwnerSummary mapSummary(AiReviewRecordEntity record) {
        if (record == null) {
            return null;
        }
        List<AiReviewOwnerSummary.DimensionScore> dimensions =
                "SUCCESS".equals(record.getStatus()) ? loadDimensionScores(record.getId()) : List.of();
        return new AiReviewOwnerSummary(
                record.getStatus(),
                record.getVerdict(),
                record.getTotalScore(),
                record.getSummaryText(),
                record.getFailureReason(),
                record.getModelId(),
                record.getFinishedAt(),
                dimensions);
    }

    private SubmissionEntity requireSubmission(Long submissionId) {
        if (submissionId == null || submissionId < 1) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "submissionId 无效");
        }
        SubmissionEntity submission = submissionMapper.selectById(submissionId);
        if (submission == null || submission.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND);
        }
        return submission;
    }

    private AiReviewRecordEntity findLatestRecord(Long submissionId) {
        LambdaQueryWrapper<AiReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewRecordEntity::getSubmissionId, submissionId)
                .eq(AiReviewRecordEntity::getDeletedFlag, 0)
                .orderByDesc(AiReviewRecordEntity::getId)
                .last("LIMIT 1");
        return aiReviewRecordMapper.selectOne(wrapper);
    }

    private List<AiReviewOwnerSummary.DimensionScore> loadDimensionScores(Long aiReviewId) {
        LambdaQueryWrapper<AiReviewDimensionScoreEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewDimensionScoreEntity::getAiReviewId, aiReviewId)
                .eq(AiReviewDimensionScoreEntity::getDeletedFlag, 0)
                .orderByAsc(AiReviewDimensionScoreEntity::getSortNo);
        return aiReviewDimensionScoreMapper.selectList(wrapper).stream()
                .map(e -> new AiReviewOwnerSummary.DimensionScore(
                        e.getDimensionKey(), e.getDimensionName(), e.getScore(),
                        BigDecimal.valueOf(100), e.getWeight(), e.getVerdict(), e.getCommentText()))
                .toList();
    }

    private boolean canAccessLabelerSubmission(SubmissionEntity submission) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (isSystemAdmin(user)) {
            return true;
        }
        Long userId = currentUserContext.requireUserId();
        return userId.equals(submission.getLabelerId());
    }

    private boolean canAccessOwnerSubmission(SubmissionEntity submission) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (isSystemAdmin(user)) {
            return true;
        }
        DataPermissionRule rule = dataPermissionService.buildRule(user.roles(), DataResourceType.TASK, user.userId());
        List<SqlPredicate> predicates = rule.predicates();
        if (predicates == null || predicates.isEmpty()) {
            return false;
        }
        if (DataScopeApplier.grantsAll(predicates)) {
            return true;
        }
        LambdaQueryWrapper<TaskEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TaskEntity::getDeletedFlag, 0)
                .eq(TaskEntity::getId, submission.getTaskId());
        DataScopeApplier.applyPredicates(wrapper, predicates);
        Long count = taskMapper.selectCount(wrapper);
        return count != null && count > 0;
    }

    private boolean isSystemAdmin(AuthenticatedUser user) {
        return user.permissions().contains("system:admin") || user.roles().contains("SYSTEM_ADMIN");
    }
}
