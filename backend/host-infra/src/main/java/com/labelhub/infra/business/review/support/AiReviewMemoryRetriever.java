package com.labelhub.infra.business.review.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.infra.persistence.entity.AiReviewDimensionScoreEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewDimensionScoreMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewMemoryRetriever {
    private static final int DEFAULT_MAX_CASES = 3;

    private final SubmissionMapper submissionMapper;
    private final ReviewRecordMapper reviewRecordMapper;
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper;
    private final TemplateVersionMapper templateVersionMapper;

    public AiReviewMemoryRetriever(
            SubmissionMapper submissionMapper,
            ReviewRecordMapper reviewRecordMapper,
            AiReviewRecordMapper aiReviewRecordMapper,
            AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper,
            TemplateVersionMapper templateVersionMapper) {
        this.submissionMapper = submissionMapper;
        this.reviewRecordMapper = reviewRecordMapper;
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.aiReviewDimensionScoreMapper = aiReviewDimensionScoreMapper;
        this.templateVersionMapper = templateVersionMapper;
    }

    /**
     * 运行时 AI 预审注入记忆：严格匹配 submission 当前绑定的模板版本。
     */
    public List<Map<String, Object>> loadRecentCases(Long templateVersionId, Long currentSubmissionId) {
        if (templateVersionId == null) {
            return List.of();
        }
        return loadRecentCasesForVersionIds(List.of(templateVersionId), currentSubmissionId);
    }

    /**
     * 模板审核配置「基于历史优化」：草稿版本本身尚无运行数据，需复用同模板/任务下
     * 已发布版本产生的人工复核样本。
     */
    public List<Map<String, Object>> loadRecentCasesForPromptOptimization(Long templateVersionId) {
        return loadRecentCasesForVersionIds(resolvePublishedLineageVersionIds(templateVersionId), null);
    }

    private List<Map<String, Object>> loadRecentCasesForVersionIds(
            List<Long> templateVersionIds, Long currentSubmissionId) {
        if (templateVersionIds == null || templateVersionIds.isEmpty()) {
            return List.of();
        }

        LambdaQueryWrapper<SubmissionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionEntity::getDeletedFlag, 0)
                .in(SubmissionEntity::getCurrentTemplateVersionId, templateVersionIds)
                .ne(currentSubmissionId != null, SubmissionEntity::getId, currentSubmissionId)
                .isNotNull(SubmissionEntity::getLastAiReviewId)
                .isNotNull(SubmissionEntity::getLastReviewRecordId)
                .orderByDesc(SubmissionEntity::getUpdatedAt)
                .last("LIMIT " + DEFAULT_MAX_CASES);

        return submissionMapper.selectList(wrapper).stream()
                .map(this::toMemoryCase)
                .filter(Objects::nonNull)
                .toList();
    }

    private List<Long> resolvePublishedLineageVersionIds(Long templateVersionId) {
        if (templateVersionId == null) {
            return List.of();
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(templateVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            return List.of();
        }

        LambdaQueryWrapper<TemplateVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateVersionEntity::getDeletedFlag, 0)
                .eq(TemplateVersionEntity::getStatus, "PUBLISHED")
                .select(TemplateVersionEntity::getId);
        Long templateId = version.getTemplateId();
        Long taskId = version.getTaskId();
        if (templateId != null && taskId != null) {
            wrapper.and(w -> w.eq(TemplateVersionEntity::getTemplateId, templateId)
                    .or()
                    .eq(TemplateVersionEntity::getTaskId, taskId));
        } else if (templateId != null) {
            wrapper.eq(TemplateVersionEntity::getTemplateId, templateId);
        } else if (taskId != null) {
            wrapper.eq(TemplateVersionEntity::getTaskId, taskId);
        } else {
            return List.of();
        }

        return templateVersionMapper.selectList(wrapper).stream()
                .map(TemplateVersionEntity::getId)
                .distinct()
                .toList();
    }

    private Map<String, Object> toMemoryCase(SubmissionEntity entity) {
        if (entity.getLastAiReviewId() == null || entity.getLastReviewRecordId() == null) {
            return null;
        }
        AiReviewRecordEntity aiReview = aiReviewRecordMapper.selectById(entity.getLastAiReviewId());
        ReviewRecordEntity reviewRecord = reviewRecordMapper.selectById(entity.getLastReviewRecordId());
        if (aiReview == null || aiReview.getDeletedFlag() == 1 || reviewRecord == null || reviewRecord.getDeletedFlag() == 1) {
            return null;
        }
        if (reviewRecord.getCommentText() == null || reviewRecord.getCommentText().isBlank()) {
            return null;
        }

        LambdaQueryWrapper<AiReviewDimensionScoreEntity> scoreWrapper = new LambdaQueryWrapper<>();
        scoreWrapper.eq(AiReviewDimensionScoreEntity::getDeletedFlag, 0)
                .eq(AiReviewDimensionScoreEntity::getAiReviewId, aiReview.getId())
                .orderByAsc(AiReviewDimensionScoreEntity::getSortNo);
        List<Map<String, Object>> dimensionScores = aiReviewDimensionScoreMapper.selectList(scoreWrapper).stream()
                .map(score -> {
                    Map<String, Object> dimension = new LinkedHashMap<>();
                    dimension.put("dimensionKey", score.getDimensionKey());
                    dimension.put("dimensionName", score.getDimensionName());
                    dimension.put("score", score.getScore());
                    dimension.put("comment", score.getCommentText());
                    return dimension;
                })
                .toList();

        Map<String, Object> memory = new LinkedHashMap<>();
        memory.put("caseId", "submission:" + entity.getId());
        memory.put("humanDecision", reviewRecord.getAction());
        memory.put("humanComment", reviewRecord.getCommentText());
        memory.put("aiVerdict", aiReview.getVerdict());
        memory.put("aiTotalScore", aiReview.getTotalScore());
        memory.put("dimensionScores", dimensionScores);
        return memory;
    }
}
