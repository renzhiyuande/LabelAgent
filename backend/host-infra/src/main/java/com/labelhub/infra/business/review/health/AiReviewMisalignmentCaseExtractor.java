package com.labelhub.infra.business.review.health;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.business.review.health.AiReviewPromptHealthAggregator.VersionSample;
import com.labelhub.infra.persistence.entity.AiReviewDimensionScoreEntity;
import com.labelhub.infra.persistence.entity.AiReviewMisalignmentCaseEntity;
import com.labelhub.infra.persistence.entity.TaskItemEntity;
import com.labelhub.infra.persistence.mapper.AiReviewDimensionScoreMapper;
import com.labelhub.infra.persistence.mapper.AiReviewMisalignmentCaseMapper;
import com.labelhub.infra.persistence.mapper.TaskItemMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewMisalignmentCaseExtractor {
    private static final Logger log = LoggerFactory.getLogger(AiReviewMisalignmentCaseExtractor.class);

    private final AiReviewPromptHealthAggregator aggregator;
    private final AiReviewMisalignmentCaseMapper misalignmentCaseMapper;
    private final AiReviewDimensionScoreMapper dimensionScoreMapper;
    private final TaskItemMapper taskItemMapper;
    private final ObjectMapper objectMapper;

    public AiReviewMisalignmentCaseExtractor(
            AiReviewPromptHealthAggregator aggregator,
            AiReviewMisalignmentCaseMapper misalignmentCaseMapper,
            AiReviewDimensionScoreMapper dimensionScoreMapper,
            TaskItemMapper taskItemMapper,
            ObjectMapper objectMapper) {
        this.aggregator = aggregator;
        this.misalignmentCaseMapper = misalignmentCaseMapper;
        this.dimensionScoreMapper = dimensionScoreMapper;
        this.taskItemMapper = taskItemMapper;
        this.objectMapper = objectMapper;
    }

    public int extractForTemplateVersion(Long templateVersionId) {
        return extractForTemplateVersion(templateVersionId, LocalDate.now().minusDays(1));
    }

    public int extractForTemplate(Long templateId, LocalDate metricDate) {
        List<Long> versionIds = aggregator.listVersionIdsForTemplate(templateId);
        List<VersionSample> samples = aggregator.loadVersionSamples(
                versionIds, metricDate, AiReviewPromptHealthAggregator.DEFAULT_WINDOW_DAYS);
        return extractFromSamples(samples);
    }

    public int extractForTemplateVersion(Long templateVersionId, LocalDate metricDate) {
        List<VersionSample> samples = aggregator.loadVersionSamples(
                templateVersionId, metricDate, AiReviewPromptHealthAggregator.DEFAULT_WINDOW_DAYS);
        return extractFromSamples(samples);
    }

    private int extractFromSamples(List<VersionSample> samples) {
        List<MisalignmentDraft> drafts = new ArrayList<>();
        for (VersionSample sample : samples) {
            if (!AiReviewPromptHealthAggregator.isMisaligned(
                    sample.aiReview().getVerdict(), sample.humanLabel())) {
                continue;
            }
            if (alreadyExists(sample.aiReview().getId(), sample.version().getId())) {
                continue;
            }
            drafts.add(toDraft(sample));
        }
        if (drafts.isEmpty()) {
            return 0;
        }

        Map<String, List<MisalignmentDraft>> grouped = drafts.stream()
                .collect(Collectors.groupingBy(MisalignmentDraft::misalignmentType));
        Instant now = Instant.now();
        int inserted = 0;
        for (List<MisalignmentDraft> group : grouped.values()) {
            List<MisalignmentDraft> sorted = group.stream()
                    .sorted(Comparator.comparing(MisalignmentDraft::submissionVersionId))
                    .toList();
            for (int i = 0; i < sorted.size(); i++) {
                MisalignmentDraft draft = sorted.get(i);
                String splitTag = AiReviewPromptHealthAggregator.assignSplitTag(i, sorted.size());
                inserted += insertCase(draft, splitTag, now);
            }
        }
        log.info("Extracted {} misalignment cases from {} samples", inserted, samples.size());
        return inserted;
    }

    private boolean alreadyExists(Long aiReviewId, Long submissionVersionId) {
        LambdaQueryWrapper<AiReviewMisalignmentCaseEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewMisalignmentCaseEntity::getDeletedFlag, 0)
                .eq(AiReviewMisalignmentCaseEntity::getAiReviewId, aiReviewId)
                .eq(AiReviewMisalignmentCaseEntity::getSubmissionVersionId, submissionVersionId);
        return misalignmentCaseMapper.selectCount(wrapper) > 0;
    }

    private MisalignmentDraft toDraft(VersionSample sample) {
        var aiReview = sample.aiReview();
        var version = sample.version();
        var appeal = sample.appeal();
        String misalignmentType = AiReviewPromptHealthAggregator.classifyMisalignmentType(
                aiReview.getVerdict(),
                sample.humanLabel(),
                appeal == null ? null : appeal.getId(),
                appeal == null ? null : appeal.getStatus());
        String humanComment = resolveHumanComment(sample);
        return new MisalignmentDraft(
                version.getTemplateVersionId(),
                version.getTaskId(),
                version.getSubmissionId(),
                version.getId(),
                aiReview.getId(),
                aiReview.getVerdict(),
                sample.humanLabel(),
                misalignmentType,
                appeal == null ? null : appeal.getId(),
                loadItemPayloadJson(version.getItemId()),
                version.getSubmitDataJson(),
                aiReview.getSummaryText(),
                loadDimensionScoresJson(aiReview.getId()),
                humanComment);
    }

    private String resolveHumanComment(VersionSample sample) {
        if (sample.appeal() != null) {
            if (sample.appeal().getDecisionReasonText() != null
                    && !sample.appeal().getDecisionReasonText().isBlank()) {
                return truncate(sample.appeal().getDecisionReasonText(), 1000);
            }
            return truncate(sample.appeal().getReasonText(), 1000);
        }
        if (sample.review() != null) {
            return truncate(sample.review().getCommentText(), 1000);
        }
        return null;
    }

    private String loadItemPayloadJson(Long itemId) {
        if (itemId == null) {
            return null;
        }
        TaskItemEntity item = taskItemMapper.selectById(itemId);
        return item == null ? null : item.getPayloadJson();
    }

    private String loadDimensionScoresJson(Long aiReviewId) {
        LambdaQueryWrapper<AiReviewDimensionScoreEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewDimensionScoreEntity::getDeletedFlag, 0)
                .eq(AiReviewDimensionScoreEntity::getAiReviewId, aiReviewId)
                .orderByAsc(AiReviewDimensionScoreEntity::getSortNo);
        List<AiReviewDimensionScoreEntity> scores = dimensionScoreMapper.selectList(wrapper);
        if (scores.isEmpty()) {
            return null;
        }
        List<Map<String, Object>> payload = scores.stream().map(score -> {
            Map<String, Object> row = new HashMap<>();
            row.put("dimensionKey", score.getDimensionKey());
            row.put("dimensionName", score.getDimensionName());
            row.put("score", score.getScore());
            row.put("weight", score.getWeight());
            row.put("verdict", score.getVerdict());
            row.put("comment", score.getCommentText());
            return row;
        }).toList();
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            return null;
        }
    }

    private int insertCase(MisalignmentDraft draft, String splitTag, Instant now) {
        AiReviewMisalignmentCaseEntity entity = new AiReviewMisalignmentCaseEntity();
        entity.setTemplateVersionId(draft.templateVersionId());
        entity.setTaskId(draft.taskId());
        entity.setSubmissionId(draft.submissionId());
        entity.setSubmissionVersionId(draft.submissionVersionId());
        entity.setAiReviewId(draft.aiReviewId());
        entity.setAiVerdict(draft.aiVerdict());
        entity.setHumanLabel(draft.humanLabel());
        entity.setMisalignmentType(draft.misalignmentType());
        entity.setAppealId(draft.appealId());
        entity.setItemPayloadJson(draft.itemPayloadJson());
        entity.setSubmitDataJson(draft.submitDataJson());
        entity.setAiSummaryText(draft.aiSummaryText());
        entity.setAiDimensionScoresJson(draft.aiDimensionScoresJson());
        entity.setHumanCommentText(draft.humanCommentText());
        entity.setSplitTag(splitTag);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        misalignmentCaseMapper.insert(entity);
        return 1;
    }

    private static String truncate(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }

    record MisalignmentDraft(
            Long templateVersionId,
            Long taskId,
            Long submissionId,
            Long submissionVersionId,
            Long aiReviewId,
            String aiVerdict,
            String humanLabel,
            String misalignmentType,
            Long appealId,
            String itemPayloadJson,
            String submitDataJson,
            String aiSummaryText,
            String aiDimensionScoresJson,
            String humanCommentText) {
    }
}
