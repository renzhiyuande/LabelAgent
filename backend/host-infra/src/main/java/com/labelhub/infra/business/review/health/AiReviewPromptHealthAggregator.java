package com.labelhub.infra.business.review.health;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.review.AiReviewPromptHealthMetrics;
import com.labelhub.infra.persistence.entity.AiReviewPromptHealthMetricEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.ReviewRecordEntity;
import com.labelhub.infra.persistence.entity.SubmissionAppealEntity;
import com.labelhub.infra.persistence.entity.SubmissionVersionEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewPromptHealthMetricMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.ReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.SubmissionAppealMapper;
import com.labelhub.infra.persistence.mapper.SubmissionVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewPromptHealthAggregator {
    private static final Logger log = LoggerFactory.getLogger(AiReviewPromptHealthAggregator.class);

    public static final int DEFAULT_WINDOW_DAYS = 30;
    public static final int MIN_SAMPLE_COUNT = 30;
    public static final double AGREEMENT_THRESHOLD = 0.70;
    public static final double APPEAL_PASS_THRESHOLD = 0.40;
    public static final double PASS_REJECT_THRESHOLD = 0.30;
    public static final long VERSION_LEVEL_TASK_ID = 0L;

    public static final String HEALTH_HEALTHY = "HEALTHY";
    public static final String HEALTH_WARNING = "WARNING";
    public static final String HEALTH_NEEDS_OPTIMIZATION = "NEEDS_OPTIMIZATION";

    private final TemplateVersionMapper templateVersionMapper;
    private final SubmissionVersionMapper submissionVersionMapper;
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final ReviewRecordMapper reviewRecordMapper;
    private final SubmissionAppealMapper submissionAppealMapper;
    private final AiReviewPromptHealthMetricMapper healthMetricMapper;
    private final ObjectMapper objectMapper;

    public AiReviewPromptHealthAggregator(
            TemplateVersionMapper templateVersionMapper,
            SubmissionVersionMapper submissionVersionMapper,
            AiReviewRecordMapper aiReviewRecordMapper,
            ReviewRecordMapper reviewRecordMapper,
            SubmissionAppealMapper submissionAppealMapper,
            AiReviewPromptHealthMetricMapper healthMetricMapper,
            ObjectMapper objectMapper) {
        this.templateVersionMapper = templateVersionMapper;
        this.submissionVersionMapper = submissionVersionMapper;
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.reviewRecordMapper = reviewRecordMapper;
        this.submissionAppealMapper = submissionAppealMapper;
        this.healthMetricMapper = healthMetricMapper;
        this.objectMapper = objectMapper;
    }

    public List<Long> listActiveTemplateVersionIds() {
        LambdaQueryWrapper<TemplateVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateVersionEntity::getDeletedFlag, 0)
                .and(w -> w.eq(TemplateVersionEntity::getStatus, "PUBLISHED")
                        .or()
                        .eq(TemplateVersionEntity::getIsCurrent, 1));
        return templateVersionMapper.selectList(wrapper).stream()
                .map(TemplateVersionEntity::getId)
                .distinct()
                .toList();
    }

    public AiReviewPromptHealthMetrics aggregateForVersion(Long templateVersionId, LocalDate metricDate) {
        return aggregateForVersion(templateVersionId, metricDate, DEFAULT_WINDOW_DAYS);
    }

    public AiReviewPromptHealthMetrics aggregateForVersion(
            Long templateVersionId, LocalDate metricDate, int windowDays) {
        List<VersionSample> samples = loadVersionSamples(templateVersionId, metricDate, windowDays);
        AiReviewPromptHealthMetrics.MetricsDetail metrics = computeMetrics(samples);
        String healthStatus = classifyHealthStatus(samples.size(), metrics);
        return upsertMetric(templateVersionId, metricDate, windowDays, samples.size(), metrics, healthStatus);
    }

    public AiReviewPromptHealthMetrics aggregateForTemplate(
            Long templateId, Long storeUnderVersionId, LocalDate metricDate, int windowDays) {
        List<Long> versionIds = listVersionIdsForTemplate(templateId);
        List<VersionSample> samples = loadVersionSamples(versionIds, metricDate, windowDays);
        AiReviewPromptHealthMetrics.MetricsDetail metrics = computeMetrics(samples);
        String healthStatus = classifyHealthStatus(samples.size(), metrics);
        return upsertMetric(storeUnderVersionId, metricDate, windowDays, samples.size(), metrics, healthStatus);
    }

    public List<Long> listVersionIdsForTemplate(Long templateId) {
        if (templateId == null) {
            return List.of();
        }
        LambdaQueryWrapper<TemplateVersionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateVersionEntity::getDeletedFlag, 0)
                .eq(TemplateVersionEntity::getTemplateId, templateId);
        return templateVersionMapper.selectList(wrapper).stream()
                .map(TemplateVersionEntity::getId)
                .distinct()
                .toList();
    }

    List<VersionSample> loadVersionSamples(Long templateVersionId, LocalDate metricDate, int windowDays) {
        return loadVersionSamples(List.of(templateVersionId), metricDate, windowDays);
    }

    List<VersionSample> loadVersionSamples(List<Long> templateVersionIds, LocalDate metricDate, int windowDays) {
        if (templateVersionIds == null || templateVersionIds.isEmpty()) {
            return List.of();
        }
        Instant windowStart = metricDate.minusDays(windowDays).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant windowEnd = metricDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

        LambdaQueryWrapper<SubmissionVersionEntity> versionWrapper = new LambdaQueryWrapper<>();
        versionWrapper.eq(SubmissionVersionEntity::getDeletedFlag, 0)
                .in(SubmissionVersionEntity::getTemplateVersionId, templateVersionIds)
                .ge(SubmissionVersionEntity::getSubmittedAt, windowStart)
                .lt(SubmissionVersionEntity::getSubmittedAt, windowEnd);
        List<SubmissionVersionEntity> versions = submissionVersionMapper.selectList(versionWrapper);
        if (versions.isEmpty()) {
            return List.of();
        }

        List<Long> versionIds = versions.stream().map(SubmissionVersionEntity::getId).toList();
        LambdaQueryWrapper<AiReviewRecordEntity> aiWrapper = new LambdaQueryWrapper<>();
        aiWrapper.eq(AiReviewRecordEntity::getDeletedFlag, 0)
                .eq(AiReviewRecordEntity::getStatus, "SUCCESS")
                .in(AiReviewRecordEntity::getSubmissionVersionId, versionIds)
                .ge(AiReviewRecordEntity::getFinishedAt, windowStart)
                .lt(AiReviewRecordEntity::getFinishedAt, windowEnd);
        List<AiReviewRecordEntity> aiRecords = aiReviewRecordMapper.selectList(aiWrapper);
        Map<Long, AiReviewRecordEntity> latestAiByVersion = aiRecords.stream()
                .collect(Collectors.toMap(
                        AiReviewRecordEntity::getSubmissionVersionId,
                        r -> r,
                        (a, b) -> compareFinishedAt(a, b) >= 0 ? a : b));

        Map<Long, SubmissionVersionEntity> versionById =
                versions.stream().collect(Collectors.toMap(SubmissionVersionEntity::getId, v -> v));

        List<Long> submissionIds = versions.stream()
                .map(SubmissionVersionEntity::getSubmissionId)
                .distinct()
                .toList();

        Map<Long, ReviewRecordEntity> latestReviewByVersion = loadLatestReviews(versionIds);
        Map<Long, SubmissionAppealEntity> latestAppealBySubmission = loadLatestAppeals(submissionIds);

        List<VersionSample> samples = new ArrayList<>();
        for (Map.Entry<Long, AiReviewRecordEntity> entry : latestAiByVersion.entrySet()) {
            Long versionId = entry.getKey();
            AiReviewRecordEntity aiReview = entry.getValue();
            SubmissionVersionEntity version = versionById.get(versionId);
            if (version == null) {
                continue;
            }
            ReviewRecordEntity review = latestReviewByVersion.get(versionId);
            SubmissionAppealEntity appeal = latestAppealBySubmission.get(version.getSubmissionId());
            String humanLabel = resolveHumanLabel(aiReview, review, appeal);
            samples.add(new VersionSample(
                    aiReview,
                    version,
                    review,
                    resolveRelevantAppeal(aiReview, appeal),
                    humanLabel));
        }
        return samples;
    }

    static AiReviewPromptHealthMetrics.MetricsDetail computeMetrics(List<VersionSample> samples) {
        if (samples.isEmpty()) {
            return new AiReviewPromptHealthMetrics.MetricsDetail(0, 0, 0, 0);
        }
        int sampleCount = samples.size();
        int agreementCount = 0;
        int aiRejectCount = 0;
        int aiRejectAppealPassCount = 0;
        int aiPassCount = 0;
        int aiPassHumanRejectCount = 0;
        int requireHumanCount = 0;
        int labeledCount = 0;

        for (VersionSample sample : samples) {
            String aiVerdict = sample.aiReview().getVerdict();
            String humanLabel = sample.humanLabel();
            if ("REQUIRE_HUMAN".equals(aiVerdict)) {
                requireHumanCount++;
            }
            if (humanLabel != null) {
                labeledCount++;
                if (isVerdictAgreed(aiVerdict, humanLabel)) {
                    agreementCount++;
                }
            }
            if ("REJECT".equals(aiVerdict)) {
                aiRejectCount++;
                if (sample.appeal() != null && "APPROVED".equals(sample.appeal().getStatus())) {
                    aiRejectAppealPassCount++;
                }
            }
            if ("PASS".equals(aiVerdict)) {
                aiPassCount++;
                if ("REJECT".equals(humanLabel) || "RETURN".equals(humanLabel)) {
                    aiPassHumanRejectCount++;
                }
            }
        }

        double agreementRate = labeledCount == 0 ? 0 : (double) agreementCount / labeledCount;
        double appealPassRate = aiRejectCount == 0 ? 0 : (double) aiRejectAppealPassCount / aiRejectCount;
        double passRejectRate = aiPassCount == 0 ? 0 : (double) aiPassHumanRejectCount / aiPassCount;
        double requireHumanRatio = (double) requireHumanCount / sampleCount;
        return new AiReviewPromptHealthMetrics.MetricsDetail(
                agreementRate, appealPassRate, passRejectRate, requireHumanRatio);
    }

    public static boolean isVerdictAgreed(String aiVerdict, String humanLabel) {
        if (aiVerdict == null || humanLabel == null) {
            return false;
        }
        return Objects.equals(normalizeVerdict(aiVerdict), normalizeVerdict(humanLabel));
    }

    static String normalizeVerdict(String verdict) {
        return verdict == null ? null : verdict.trim().toUpperCase();
    }

    public static String resolveHumanLabel(
            AiReviewRecordEntity aiReview, ReviewRecordEntity latestReview, SubmissionAppealEntity latestAppeal) {
        SubmissionAppealEntity relevantAppeal = resolveRelevantAppeal(aiReview, latestAppeal);
        if (relevantAppeal != null) {
            if ("APPROVED".equals(relevantAppeal.getStatus())) {
                return "PASS";
            }
            if ("REJECTED".equals(relevantAppeal.getStatus())) {
                return "REJECT";
            }
        }
        if (latestReview != null && latestReview.getAction() != null) {
            return mapReviewAction(latestReview.getAction());
        }
        if ("PASS".equals(aiReview.getVerdict())) {
            return "PASS";
        }
        return null;
    }

    static SubmissionAppealEntity resolveRelevantAppeal(
            AiReviewRecordEntity aiReview, SubmissionAppealEntity latestAppeal) {
        if (latestAppeal == null || latestAppeal.getDecidedAt() == null) {
            return null;
        }
        if (aiReview.getFinishedAt() != null
                && latestAppeal.getDecidedAt().isBefore(aiReview.getFinishedAt())) {
            return null;
        }
        if ("APPROVED".equals(latestAppeal.getStatus()) || "REJECTED".equals(latestAppeal.getStatus())) {
            return latestAppeal;
        }
        return null;
    }

    static String mapReviewAction(String action) {
        return switch (normalizeVerdict(action)) {
            case "PASS", "APPROVE", "APPROVED" -> "PASS";
            case "REJECT", "REJECTED" -> "REJECT";
            case "RETURN", "RETURNED" -> "RETURN";
            default -> action.trim().toUpperCase();
        };
    }

    public static String classifyMisalignmentType(
            String aiVerdict, String humanLabel, Long appealId, String appealStatus) {
        if (appealId != null && appealStatus != null) {
            if ("APPROVED".equals(appealStatus) && "REJECT".equals(aiVerdict)) {
                return "APPEAL_OVERTURN";
            }
            if ("REJECTED".equals(appealStatus) && "PASS".equals(aiVerdict)) {
                return "APPEAL_OVERTURN";
            }
        }
        if ("REJECT".equals(aiVerdict) && "PASS".equals(humanLabel)) {
            return "AI_STRICT";
        }
        if ("PASS".equals(aiVerdict) && ("REJECT".equals(humanLabel) || "RETURN".equals(humanLabel))) {
            return "AI_LENIENT";
        }
        return "VERDICT_MISMATCH";
    }

    public static String classifyHealthStatus(int sampleCount, AiReviewPromptHealthMetrics.MetricsDetail metrics) {
        if (sampleCount < MIN_SAMPLE_COUNT) {
            return HEALTH_WARNING;
        }
        if (metrics.aiHumanAgreementRate() < AGREEMENT_THRESHOLD
                || metrics.aiRejectAppealPassRate() > APPEAL_PASS_THRESHOLD
                || metrics.aiPassHumanRejectRate() > PASS_REJECT_THRESHOLD) {
            return HEALTH_NEEDS_OPTIMIZATION;
        }
        return HEALTH_HEALTHY;
    }

    public static boolean isMisaligned(String aiVerdict, String humanLabel) {
        return humanLabel != null && !isVerdictAgreed(aiVerdict, humanLabel);
    }

    public static String assignSplitTag(int indexInType, int totalInType) {
        if (totalInType <= 0) {
            return "TRAIN";
        }
        int trainCount = (int) Math.ceil(totalInType * 0.7);
        return indexInType < trainCount ? "TRAIN" : "TEST";
    }

    private Map<Long, ReviewRecordEntity> loadLatestReviews(List<Long> versionIds) {
        if (versionIds.isEmpty()) {
            return Map.of();
        }
        LambdaQueryWrapper<ReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ReviewRecordEntity::getDeletedFlag, 0)
                .in(ReviewRecordEntity::getSubmissionVersionId, versionIds);
        return reviewRecordMapper.selectList(wrapper).stream()
                .collect(Collectors.toMap(
                        ReviewRecordEntity::getSubmissionVersionId,
                        r -> r,
                        (a, b) -> compareDecidedAt(a, b) >= 0 ? a : b));
    }

    private Map<Long, SubmissionAppealEntity> loadLatestAppeals(List<Long> submissionIds) {
        if (submissionIds.isEmpty()) {
            return Map.of();
        }
        LambdaQueryWrapper<SubmissionAppealEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(SubmissionAppealEntity::getDeletedFlag, 0)
                .in(SubmissionAppealEntity::getSubmissionId, submissionIds);
        return submissionAppealMapper.selectList(wrapper).stream()
                .collect(Collectors.toMap(
                        SubmissionAppealEntity::getSubmissionId,
                        a -> a,
                        (left, right) -> compareAppealNo(left, right) >= 0 ? left : right));
    }

    private AiReviewPromptHealthMetrics upsertMetric(
            Long templateVersionId,
            LocalDate metricDate,
            int windowDays,
            int sampleCount,
            AiReviewPromptHealthMetrics.MetricsDetail metrics,
            String healthStatus) {
        LambdaQueryWrapper<AiReviewPromptHealthMetricEntity> existingWrapper = new LambdaQueryWrapper<>();
        existingWrapper.eq(AiReviewPromptHealthMetricEntity::getDeletedFlag, 0)
                .eq(AiReviewPromptHealthMetricEntity::getTemplateVersionId, templateVersionId)
                .eq(AiReviewPromptHealthMetricEntity::getTaskId, VERSION_LEVEL_TASK_ID)
                .eq(AiReviewPromptHealthMetricEntity::getMetricDate, metricDate)
                .eq(AiReviewPromptHealthMetricEntity::getWindowDays, windowDays);

        String metricsJson = writeMetricsJson(metrics);
        Instant now = Instant.now();
        AiReviewPromptHealthMetricEntity existing = healthMetricMapper.selectOne(existingWrapper);
        if (existing != null) {
            existing.setSampleCount(sampleCount);
            existing.setMetricsJson(metricsJson);
            existing.setHealthStatus(healthStatus);
            existing.setUpdatedAt(now);
            healthMetricMapper.updateById(existing);
            return toDto(existing, metrics);
        }

        AiReviewPromptHealthMetricEntity entity = new AiReviewPromptHealthMetricEntity();
        entity.setTemplateVersionId(templateVersionId);
        entity.setTaskId(VERSION_LEVEL_TASK_ID);
        entity.setMetricDate(metricDate);
        entity.setWindowDays(windowDays);
        entity.setSampleCount(sampleCount);
        entity.setMetricsJson(metricsJson);
        entity.setHealthStatus(healthStatus);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        healthMetricMapper.insert(entity);
        log.info(
                "Aggregated prompt health for templateVersionId={} date={} samples={} status={}",
                templateVersionId,
                metricDate,
                sampleCount,
                healthStatus);
        return toDto(entity, metrics);
    }

    AiReviewPromptHealthMetrics toDto(
            AiReviewPromptHealthMetricEntity entity, AiReviewPromptHealthMetrics.MetricsDetail metrics) {
        return new AiReviewPromptHealthMetrics(
                entity.getId(),
                entity.getTemplateVersionId(),
                entity.getTaskId(),
                entity.getMetricDate(),
                entity.getWindowDays() == null ? DEFAULT_WINDOW_DAYS : entity.getWindowDays(),
                entity.getSampleCount() == null ? 0 : entity.getSampleCount(),
                metrics,
                entity.getHealthStatus(),
                entity.getCreatedAt());
    }

    AiReviewPromptHealthMetrics.MetricsDetail parseMetricsJson(String metricsJson) {
        if (metricsJson == null || metricsJson.isBlank()) {
            return new AiReviewPromptHealthMetrics.MetricsDetail(0, 0, 0, 0);
        }
        try {
            return objectMapper.readValue(metricsJson, AiReviewPromptHealthMetrics.MetricsDetail.class);
        } catch (Exception ex) {
            log.warn("Failed to parse metrics_json: {}", ex.getMessage());
            return new AiReviewPromptHealthMetrics.MetricsDetail(0, 0, 0, 0);
        }
    }

    private String writeMetricsJson(AiReviewPromptHealthMetrics.MetricsDetail metrics) {
        try {
            return objectMapper.writeValueAsString(metrics);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize metrics_json", ex);
        }
    }

    private static int compareFinishedAt(AiReviewRecordEntity a, AiReviewRecordEntity b) {
        Instant left = a.getFinishedAt() == null ? a.getStartedAt() : a.getFinishedAt();
        Instant right = b.getFinishedAt() == null ? b.getStartedAt() : b.getFinishedAt();
        if (left == null && right == null) {
            return 0;
        }
        if (left == null) {
            return -1;
        }
        if (right == null) {
            return 1;
        }
        return left.compareTo(right);
    }

    private static int compareDecidedAt(ReviewRecordEntity a, ReviewRecordEntity b) {
        Instant left = a.getDecidedAt() == null ? a.getCreatedAt() : a.getDecidedAt();
        Instant right = b.getDecidedAt() == null ? b.getCreatedAt() : b.getDecidedAt();
        if (left == null && right == null) {
            return 0;
        }
        if (left == null) {
            return -1;
        }
        if (right == null) {
            return 1;
        }
        return left.compareTo(right);
    }

    private static int compareAppealNo(SubmissionAppealEntity a, SubmissionAppealEntity b) {
        int left = a.getAppealNo() == null ? 0 : a.getAppealNo();
        int right = b.getAppealNo() == null ? 0 : b.getAppealNo();
        return Integer.compare(left, right);
    }

    record VersionSample(
            AiReviewRecordEntity aiReview,
            SubmissionVersionEntity version,
            ReviewRecordEntity review,
            SubmissionAppealEntity appeal,
            String humanLabel) {
    }
}
