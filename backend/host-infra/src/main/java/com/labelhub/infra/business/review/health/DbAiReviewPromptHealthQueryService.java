package com.labelhub.infra.business.review.health;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.review.AiReviewPromptHealthAggregationScope;
import com.labelhub.core.review.AiReviewPromptHealthMetrics;
import com.labelhub.core.review.AiReviewPromptHealthOverview;
import com.labelhub.core.review.AiReviewPromptHealthQueryService;
import com.labelhub.core.review.AiReviewScoreCalibrationSummary;
import com.labelhub.infra.persistence.entity.AiReviewPromptHealthMetricEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.entity.TemplatesEntity;
import com.labelhub.infra.persistence.mapper.AiReviewPromptHealthMetricMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.persistence.mapper.TemplatesMapper;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbAiReviewPromptHealthQueryService implements AiReviewPromptHealthQueryService {
    private static final Logger log = LoggerFactory.getLogger(DbAiReviewPromptHealthQueryService.class);

    private final AiReviewPromptHealthAggregator aggregator;
    private final AiReviewMisalignmentCaseExtractor extractor;
    private final TemplatesMapper templatesMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final AiReviewPromptHealthMetricMapper healthMetricMapper;
    private final AiReviewScoreCalibrationSummarizer scoreCalibrationSummarizer;

    public DbAiReviewPromptHealthQueryService(
            AiReviewPromptHealthAggregator aggregator,
            AiReviewMisalignmentCaseExtractor extractor,
            TemplatesMapper templatesMapper,
            TemplateVersionMapper templateVersionMapper,
            AiReviewPromptHealthMetricMapper healthMetricMapper,
            AiReviewScoreCalibrationSummarizer scoreCalibrationSummarizer) {
        this.aggregator = aggregator;
        this.extractor = extractor;
        this.templatesMapper = templatesMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.healthMetricMapper = healthMetricMapper;
        this.scoreCalibrationSummarizer = scoreCalibrationSummarizer;
    }

    @Override
    public void aggregateForDate(LocalDate metricDate) {
        List<Long> versionIds = aggregator.listActiveTemplateVersionIds();
        log.info("Aggregating prompt health for {} active template versions on {}", versionIds.size(), metricDate);
        for (Long versionId : versionIds) {
            aggregator.aggregateForVersion(versionId, metricDate);
        }
    }

    @Override
    public int extractMisalignmentCases(Long templateVersionId) {
        return extractor.extractForTemplateVersion(templateVersionId);
    }

    @Override
    public AiReviewPromptHealthOverview getHealthOverview(Long templateId, Long scopeTemplateVersionId) {
        TemplatesEntity template = templatesMapper.selectById(templateId);
        if (template == null || template.getDeletedFlag() == 1) {
            return emptyOverview(templateId);
        }
        Long currentVersionId = template.getCurrentTemplateVersionId();
        if (currentVersionId == null) {
            return emptyOverview(templateId);
        }

        AggregationContext context = resolveContext(templateId, scopeTemplateVersionId, currentVersionId);
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(6);

        LambdaQueryWrapper<AiReviewPromptHealthMetricEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AiReviewPromptHealthMetricEntity::getDeletedFlag, 0)
                .eq(AiReviewPromptHealthMetricEntity::getTemplateVersionId, context.metricsStorageVersionId())
                .eq(AiReviewPromptHealthMetricEntity::getTaskId, AiReviewPromptHealthAggregator.VERSION_LEVEL_TASK_ID)
                .ge(AiReviewPromptHealthMetricEntity::getMetricDate, fromDate)
                .le(AiReviewPromptHealthMetricEntity::getMetricDate, today)
                .orderByDesc(AiReviewPromptHealthMetricEntity::getMetricDate);
        List<AiReviewPromptHealthMetricEntity> entities = healthMetricMapper.selectList(wrapper);

        List<AiReviewPromptHealthMetrics> trend = entities.stream()
                .map(entity -> aggregator.toDto(entity, aggregator.parseMetricsJson(entity.getMetricsJson())))
                .sorted(Comparator.comparing(AiReviewPromptHealthMetrics::metricDate).reversed())
                .toList();

        AiReviewPromptHealthMetrics latest = trend.isEmpty() ? null : trend.getFirst();
        if (latest == null) {
            latest = aggregateNow(context, today);
            trend = new ArrayList<>(List.of(latest));
        }

        int windowDays = latest != null ? latest.windowDays() : AiReviewPromptHealthAggregator.DEFAULT_WINDOW_DAYS;
        AiReviewScoreCalibrationSummary scoreCalibrationSummary = summarize(context, windowDays, today);
        return new AiReviewPromptHealthOverview(
                templateId,
                currentVersionId,
                context.scope(),
                latest,
                trend,
                scoreCalibrationSummary);
    }

    @Override
    public AiReviewPromptHealthOverview refreshHealth(Long templateId, Long scopeTemplateVersionId) {
        TemplatesEntity template = requireTemplate(templateId);
        Long currentVersionId = template.getCurrentTemplateVersionId();
        if (currentVersionId == null) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND, "Template has no current version");
        }

        AggregationContext context = resolveContext(templateId, scopeTemplateVersionId, currentVersionId);
        LocalDate metricDate = LocalDate.now();
        aggregateNow(context, metricDate);
        int extracted = context.templateScope()
                ? extractor.extractForTemplate(templateId, metricDate)
                : extractor.extractForTemplateVersion(context.scopeVersionId(), metricDate);
        log.info(
                "Refreshed prompt health for templateId={}, scope={}, metricsVersionId={}, metricDate={}, extractedCases={}",
                templateId,
                context.scope().label(),
                context.metricsStorageVersionId(),
                metricDate,
                extracted);
        return getHealthOverview(templateId, scopeTemplateVersionId);
    }

    private AiReviewPromptHealthMetrics aggregateNow(AggregationContext context, LocalDate metricDate) {
        if (context.templateScope()) {
            return aggregator.aggregateForTemplate(
                    context.templateId(),
                    context.metricsStorageVersionId(),
                    metricDate,
                    AiReviewPromptHealthAggregator.DEFAULT_WINDOW_DAYS);
        }
        return aggregator.aggregateForVersion(
                context.scopeVersionId(),
                metricDate,
                AiReviewPromptHealthAggregator.DEFAULT_WINDOW_DAYS);
    }

    private AiReviewScoreCalibrationSummary summarize(
            AggregationContext context, int windowDays, LocalDate metricDate) {
        if (context.templateScope()) {
            return scoreCalibrationSummarizer.summarizeForTemplate(context.templateId(), windowDays, metricDate);
        }
        return scoreCalibrationSummarizer.summarizeForVersion(context.scopeVersionId(), windowDays, metricDate);
    }

    private AggregationContext resolveContext(
            Long templateId, Long scopeTemplateVersionId, Long currentVersionId) {
        List<Long> versionIds = aggregator.listVersionIdsForTemplate(templateId);
        if (scopeTemplateVersionId == null) {
            return new AggregationContext(
                    templateId,
                    true,
                    null,
                    currentVersionId,
                    AiReviewPromptHealthAggregationScope.templateScope(versionIds.size()));
        }
        if (!versionIds.contains(scopeTemplateVersionId)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Template version not found for template");
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(scopeTemplateVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Template version not found");
        }
        return new AggregationContext(
                templateId,
                false,
                scopeTemplateVersionId,
                scopeTemplateVersionId,
                AiReviewPromptHealthAggregationScope.versionScope(
                        scopeTemplateVersionId, version.getVersionNo(), version.getTemplateName()));
    }

    private TemplatesEntity requireTemplate(Long templateId) {
        TemplatesEntity template = templatesMapper.selectById(templateId);
        if (template == null || template.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND);
        }
        return template;
    }

    private static AiReviewPromptHealthOverview emptyOverview(Long templateId) {
        return new AiReviewPromptHealthOverview(
                templateId,
                null,
                null,
                null,
                List.of(),
                emptyCalibrationSummary());
    }

    private static AiReviewScoreCalibrationSummary emptyCalibrationSummary() {
        return new AiReviewScoreCalibrationSummary(0, 0, 0, List.of());
    }

    private record AggregationContext(
            Long templateId,
            boolean templateScope,
            Long scopeVersionId,
            Long metricsStorageVersionId,
            AiReviewPromptHealthAggregationScope scope) {
    }
}
