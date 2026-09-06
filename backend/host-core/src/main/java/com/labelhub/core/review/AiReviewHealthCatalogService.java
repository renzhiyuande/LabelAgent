package com.labelhub.core.review;

/**
 * AI 预审质检大屏任务/模板目录查询。
 */
public interface AiReviewHealthCatalogService {

    /**
     * 分页检索已关联模板的任务目录，支持关键词匹配任务名、编码或模板名、编码、ID。
     *
     * @param includeTemplateId 若不在当前页结果中，则额外附带该模板（用于深链直达）。
     */
    AiReviewHealthCatalogPage listCatalog(int page, int pageSize, String keyword, Long includeTemplateId);
}
