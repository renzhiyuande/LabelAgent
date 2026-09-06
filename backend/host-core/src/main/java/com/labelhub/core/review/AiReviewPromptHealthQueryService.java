package com.labelhub.core.review;

import java.time.LocalDate;

/**
 * AI 预审提示词健康度查询与批处理服务接口。
 */
public interface AiReviewPromptHealthQueryService {

    /** 对指定日期聚合所有活跃模板版本的健康指标。 */
    void aggregateForDate(LocalDate metricDate);

    /** 抽取指定模板版本的误判样本，返回新增条数。 */
    int extractMisalignmentCases(Long templateVersionId);

    /**
     * 获取模板健康度总览（含近 7 日趋势）。
     *
     * @param scopeTemplateVersionId 为空时按模板全版本聚合；有值时仅聚合该版本（须属于模板）
     */
    AiReviewPromptHealthOverview getHealthOverview(Long templateId, Long scopeTemplateVersionId);

    /**
     * 立即执行指标聚合与误判样本抽取，并返回最新总览。
     *
     * @param scopeTemplateVersionId 为空时按模板全版本聚合；有值时仅聚合该版本
     */
    AiReviewPromptHealthOverview refreshHealth(Long templateId, Long scopeTemplateVersionId);
}
