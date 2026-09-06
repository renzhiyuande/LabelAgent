package com.labelhub.core.review;

import java.util.List;

/**
 * AI 预审质检大屏目录分页结果。
 */
public record AiReviewHealthCatalogPage(
        long total,
        int page,
        int pageSize,
        List<AiReviewHealthCatalogItem> list) {
}
