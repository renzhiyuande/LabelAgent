package com.labelhub.core.review;

/**
 * AI 预审质检大屏左侧目录项：任务 + 模板摘要。
 */
public record AiReviewHealthCatalogItem(
        Long taskId,
        String taskTitle,
        String taskCode,
        Long templateId,
        String templateName,
        String templateCode) {
}
