package com.labelhub.infra.business.review.support;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.ReviewerAiReviewDimensionSnapshot;
import com.labelhub.core.business.BusinessDtos.ReviewerAiReviewScoreCalibrationSnapshot;
import com.labelhub.core.business.BusinessDtos.ReviewerAiReviewSnapshot;
import com.labelhub.core.review.AiReviewDimensionResult;
import com.labelhub.core.review.AiReviewResult;
import com.labelhub.infra.persistence.entity.AiReviewDimensionScoreEntity;
import com.labelhub.infra.persistence.entity.AiReviewRecordEntity;
import com.labelhub.infra.persistence.entity.TemplateReviewDimensionEntity;
import com.labelhub.infra.persistence.mapper.AiReviewDimensionScoreMapper;
import com.labelhub.infra.persistence.mapper.AiReviewRecordMapper;
import com.labelhub.infra.persistence.mapper.TemplateReviewDimensionMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AiReviewRecordReader {
    private final AiReviewRecordMapper aiReviewRecordMapper;
    private final AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper;
    private final TemplateReviewDimensionMapper templateReviewDimensionMapper;
    private final ObjectMapper objectMapper;

    public AiReviewRecordReader(
            AiReviewRecordMapper aiReviewRecordMapper,
            AiReviewDimensionScoreMapper aiReviewDimensionScoreMapper,
            TemplateReviewDimensionMapper templateReviewDimensionMapper,
            ObjectMapper objectMapper) {
        this.aiReviewRecordMapper = aiReviewRecordMapper;
        this.aiReviewDimensionScoreMapper = aiReviewDimensionScoreMapper;
        this.templateReviewDimensionMapper = templateReviewDimensionMapper;
        this.objectMapper = objectMapper;
    }

    public ReviewerAiReviewSnapshot toSnapshot(Long aiReviewId, Long templateVersionId) {
        if (aiReviewId == null) {
            return null;
        }
        AiReviewRecordEntity record = aiReviewRecordMapper.selectById(aiReviewId);
        if (record == null || record.getDeletedFlag() == 1) {
            return null;
        }
        Map<String, BigDecimal> maxScoreByKey = loadMaxScores(templateVersionId);
        List<ReviewerAiReviewDimensionSnapshot> dimensions = loadDimensionSnapshots(record.getId(), maxScoreByKey);
        return new ReviewerAiReviewSnapshot(
                record.getId(),
                record.getPlatformKey(),
                record.getModelId(),
                record.getVerdict(),
                record.getTotalScore() == null ? null : record.getTotalScore().doubleValue(),
                record.getSummaryText(),
                record.getPromptSnapshot(),
                record.getRawResponseText(),
                record.getFinishedAt() != null ? record.getFinishedAt() : record.getStartedAt(),
                dimensions,
                loadScoreCalibrations(record));
    }

    public Map<Long, ReviewerAiReviewSnapshot> loadSnapshotsByIds(List<Long> aiReviewIds, Map<Long, Long> versionByReviewId) {
        if (aiReviewIds == null || aiReviewIds.isEmpty()) {
            return Map.of();
        }
        LambdaQueryWrapper<AiReviewRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewRecordEntity::getDeletedFlag, 0).in(AiReviewRecordEntity::getId, aiReviewIds);
        List<AiReviewRecordEntity> records = aiReviewRecordMapper.selectList(wrapper);
        if (records.isEmpty()) {
            return Map.of();
        }
        Map<Long, Map<String, BigDecimal>> maxScoreCache = new HashMap<>();
        Map<Long, List<AiReviewDimensionScoreEntity>> scoresByReview = loadScoresGrouped(
                records.stream().map(AiReviewRecordEntity::getId).toList());
        Map<Long, ReviewerAiReviewSnapshot> result = new HashMap<>();
        for (AiReviewRecordEntity record : records) {
            Long versionId = versionByReviewId == null ? null : versionByReviewId.get(record.getId());
            Map<String, BigDecimal> maxScoreByKey = versionId == null
                    ? Map.of()
                    : maxScoreCache.computeIfAbsent(versionId, this::loadMaxScores);
            List<ReviewerAiReviewDimensionSnapshot> dimensions = mapDimensionSnapshots(
                    scoresByReview.getOrDefault(record.getId(), List.of()), maxScoreByKey);
            result.put(record.getId(), new ReviewerAiReviewSnapshot(
                    record.getId(),
                    record.getPlatformKey(),
                    record.getModelId(),
                    record.getVerdict(),
                    record.getTotalScore() == null ? null : record.getTotalScore().doubleValue(),
                    record.getSummaryText(),
                    record.getPromptSnapshot(),
                    record.getRawResponseText(),
                    record.getFinishedAt() != null ? record.getFinishedAt() : record.getStartedAt(),
                    dimensions,
                    loadScoreCalibrations(record)));
        }
        return result;
    }

    private List<ReviewerAiReviewDimensionSnapshot> loadDimensionSnapshots(
            Long aiReviewId, Map<String, BigDecimal> maxScoreByKey) {
        LambdaQueryWrapper<AiReviewDimensionScoreEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewDimensionScoreEntity::getDeletedFlag, 0)
                .eq(AiReviewDimensionScoreEntity::getAiReviewId, aiReviewId)
                .orderByAsc(AiReviewDimensionScoreEntity::getSortNo);
        return mapDimensionSnapshots(aiReviewDimensionScoreMapper.selectList(wrapper), maxScoreByKey);
    }

    private Map<Long, List<AiReviewDimensionScoreEntity>> loadScoresGrouped(List<Long> aiReviewIds) {
        LambdaQueryWrapper<AiReviewDimensionScoreEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewDimensionScoreEntity::getDeletedFlag, 0)
                .in(AiReviewDimensionScoreEntity::getAiReviewId, aiReviewIds)
                .orderByAsc(AiReviewDimensionScoreEntity::getSortNo);
        return aiReviewDimensionScoreMapper.selectList(wrapper).stream()
                .collect(Collectors.groupingBy(AiReviewDimensionScoreEntity::getAiReviewId));
    }

    private List<ReviewerAiReviewDimensionSnapshot> mapDimensionSnapshots(
            List<AiReviewDimensionScoreEntity> scores, Map<String, BigDecimal> maxScoreByKey) {
        return scores.stream()
                .map(score -> new ReviewerAiReviewDimensionSnapshot(
                        score.getDimensionKey(),
                        score.getDimensionName(),
                        score.getScore() == null ? null : score.getScore().doubleValue(),
                        maxScoreByKey.get(score.getDimensionKey()) == null
                                ? null
                                : maxScoreByKey.get(score.getDimensionKey()).doubleValue(),
                        score.getWeight() == null ? null : score.getWeight().doubleValue(),
                        score.getVerdict(),
                        score.getCommentText()))
                .toList();
    }

    private Map<String, BigDecimal> loadMaxScores(Long templateVersionId) {
        if (templateVersionId == null) {
            return Map.of();
        }
        LambdaQueryWrapper<TemplateReviewDimensionEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TemplateReviewDimensionEntity::getTemplateVersionId, templateVersionId);
        return templateReviewDimensionMapper.selectList(wrapper).stream()
                .filter(d -> d.getDimensionKey() != null)
                .collect(Collectors.toMap(
                        TemplateReviewDimensionEntity::getDimensionKey,
                        d -> d.getScoreMax() == null ? BigDecimal.valueOf(100) : d.getScoreMax(),
                        (a, b) -> a));
    }

    public Map<String, Object> readParsedResult(AiReviewRecordEntity record) {
        if (record == null || record.getParsedResultJson() == null || record.getParsedResultJson().isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(record.getParsedResultJson(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    public List<ReviewerAiReviewScoreCalibrationSnapshot> readScoreCalibrations(AiReviewRecordEntity record) {
        return loadScoreCalibrations(record);
    }

    private List<ReviewerAiReviewScoreCalibrationSnapshot> loadScoreCalibrations(AiReviewRecordEntity record) {
        Object raw = readParsedResult(record).get("scoreCalibrations");
        if (!(raw instanceof List<?> entries) || entries.isEmpty()) {
            return List.of();
        }
        return entries.stream()
                .filter(Map.class::isInstance)
                .map(entry -> mapScoreCalibration((Map<?, ?>) entry))
                .filter(item -> item != null)
                .toList();
    }

    private ReviewerAiReviewScoreCalibrationSnapshot mapScoreCalibration(Map<?, ?> entry) {
        String dimensionKey = asString(entry.get("dimensionKey"));
        String dimensionName = asString(entry.get("dimensionName"));
        Integer rawScore = asInteger(entry.get("rawScore"));
        Integer calibratedScore = asInteger(entry.get("calibratedScore"));
        if (dimensionKey == null || rawScore == null || calibratedScore == null) {
            return null;
        }
        return new ReviewerAiReviewScoreCalibrationSnapshot(
                dimensionKey,
                dimensionName,
                rawScore,
                calibratedScore,
                asDouble(entry.get("anchor")),
                asDouble(entry.get("tolerance")));
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static Integer asInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private static Double asDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Double.parseDouble(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    public AiReviewResult toEngineResult(AiReviewRecordEntity record, List<AiReviewDimensionScoreEntity> scores) {
        List<AiReviewDimensionResult> dimensions = scores == null ? List.of() : scores.stream()
                .map(score -> new AiReviewDimensionResult(
                        score.getDimensionKey(),
                        score.getDimensionName(),
                        score.getScore(),
                        score.getWeight(),
                        score.getVerdict(),
                        score.getCommentText()))
                .toList();
        return new AiReviewResult(
                record.getPlatformKey(),
                record.getModelId(),
                record.getVerdict(),
                record.getTotalScore(),
                record.getSummaryText(),
                record.getPromptSnapshot(),
                readJsonMap(record.getInputSnapshotJson()),
                readParsedResult(record),
                record.getRawResponseText(),
                record.getProviderRequestId(),
                dimensions);
    }

    private Map<String, Object> readJsonMap(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ignored) {
            return Collections.emptyMap();
        }
    }
}
