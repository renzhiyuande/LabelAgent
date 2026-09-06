package com.labelhub.infra.business.review.health;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.business.BusinessDtos.ReviewerAiReviewScoreCalibrationSnapshot;
import com.labelhub.core.review.AiReviewScoreCalibrationSummary;
import com.labelhub.infra.business.review.support.AiReviewRecordReader;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionVersionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionVersionMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewScoreCalibrationSummarizer {
    private static final int RECENT_ENTRY_LIMIT = 20;

    private final AiReviewPromptHealthAggregator aggregator;
    private final SubmissionVersionMapper submissionVersionMapper;
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final AiReviewRecordReader aiReviewRecordReader;

    public AiReviewScoreCalibrationSummarizer(
            AiReviewPromptHealthAggregator aggregator,
            SubmissionVersionMapper submissionVersionMapper,
            AiReviewRecordMapper aiReviewRecordMapper,
            AiReviewRecordReader aiReviewRecordReader) {
        this.aggregator = aggregator;
        this.submissionVersionMapper = submissionVersionMapper;
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.aiReviewRecordReader = aiReviewRecordReader;
    }

    public AiReviewScoreCalibrationSummary summarize(Long templateVersionId, int windowDays) {
        if (templateVersionId == null) {
            return emptySummary();
        }
        return summarize(List.of(templateVersionId), windowDays, LocalDate.now().minusDays(1));
    }

    public AiReviewScoreCalibrationSummary summarizeForTemplate(Long templateId, int windowDays) {
        return summarizeForTemplate(templateId, windowDays, LocalDate.now());
    }

    public AiReviewScoreCalibrationSummary summarizeForTemplate(
            Long templateId, int windowDays, LocalDate metricDate) {
        if (templateId == null) {
            return emptySummary();
        }
        return summarize(aggregator.listVersionIdsForTemplate(templateId), windowDays, metricDate);
    }

    public AiReviewScoreCalibrationSummary summarizeForVersion(
            Long templateVersionId, int windowDays, LocalDate metricDate) {
        if (templateVersionId == null) {
            return emptySummary();
        }
        return summarize(List.of(templateVersionId), windowDays, metricDate);
    }

    private AiReviewScoreCalibrationSummary summarize(
            List<Long> templateVersionIds, int windowDays, LocalDate metricDate) {
        if (templateVersionIds == null || templateVersionIds.isEmpty()) {
            return emptySummary();
        }
        Instant windowStart = metricDate.minusDays(windowDays).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant windowEnd = metricDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

        LambdaQueryWrapper<SubmissionVersionEntity> versionWrapper = new LambdaQueryWrapper<>();
        versionWrapper.eq(SubmissionVersionEntity::getDeletedFlag, 0)
                .in(SubmissionVersionEntity::getTemplateVersionId, templateVersionIds)
                .ge(SubmissionVersionEntity::getSubmittedAt, windowStart)
                .lt(SubmissionVersionEntity::getSubmittedAt, windowEnd);
        List<Long> versionIds = submissionVersionMapper.selectList(versionWrapper).stream()
                .map(SubmissionVersionEntity::getId)
                .toList();
        if (versionIds.isEmpty()) {
            return emptySummary();
        }

        LambdaQueryWrapper<AiReviewRecordEntity> aiWrapper = new LambdaQueryWrapper<>();
        aiWrapper.eq(AiReviewRecordEntity::getDeletedFlag, 0)
                .eq(AiReviewRecordEntity::getStatus, "SUCCESS")
                .in(AiReviewRecordEntity::getSubmissionVersionId, versionIds)
                .ge(AiReviewRecordEntity::getFinishedAt, windowStart)
                .lt(AiReviewRecordEntity::getFinishedAt, windowEnd)
                .isNotNull(AiReviewRecordEntity::getParsedResultJson)
                .orderByDesc(AiReviewRecordEntity::getFinishedAt);
        List<AiReviewRecordEntity> records = aiReviewRecordMapper.selectList(aiWrapper);

        int calibratedReviewCount = 0;
        int calibrationEventCount = 0;
        List<AiReviewScoreCalibrationSummary.Entry> recentEntries = new ArrayList<>();

        for (AiReviewRecordEntity record : records) {
            List<ReviewerAiReviewScoreCalibrationSnapshot> calibrations =
                    aiReviewRecordReader.readScoreCalibrations(record);
            if (calibrations.isEmpty()) {
                continue;
            }
            calibratedReviewCount += 1;
            calibrationEventCount += calibrations.size();
            Instant analyzedAt = record.getFinishedAt() != null ? record.getFinishedAt() : record.getStartedAt();
            for (ReviewerAiReviewScoreCalibrationSnapshot calibration : calibrations) {
                recentEntries.add(new AiReviewScoreCalibrationSummary.Entry(
                        record.getSubmissionId(),
                        calibration.dimensionKey(),
                        calibration.dimensionName(),
                        calibration.rawScore(),
                        calibration.calibratedScore(),
                        calibration.anchor(),
                        calibration.tolerance(),
                        analyzedAt));
            }
        }

        recentEntries.sort(Comparator.comparing(AiReviewScoreCalibrationSummary.Entry::analyzedAt).reversed());
        if (recentEntries.size() > RECENT_ENTRY_LIMIT) {
            recentEntries = new ArrayList<>(recentEntries.subList(0, RECENT_ENTRY_LIMIT));
        }

        return new AiReviewScoreCalibrationSummary(
                records.size(),
                calibratedReviewCount,
                calibrationEventCount,
                recentEntries);
    }

    private static AiReviewScoreCalibrationSummary emptySummary() {
        return new AiReviewScoreCalibrationSummary(0, 0, 0, List.of());
    }
}
