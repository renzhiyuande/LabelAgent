package com.labelhub.core.review;

/**
 * 描述质检大屏指标按模板或按单版本聚合的范围。
 */
public record AiReviewPromptHealthAggregationScope(
        String mode,
        Long templateVersionId,
        Integer versionCount,
        String label) {

    public static final String MODE_TEMPLATE = "TEMPLATE";
    public static final String MODE_VERSION = "VERSION";

    public static AiReviewPromptHealthAggregationScope templateScope(int versionCount) {
        String label = versionCount <= 1
                ? "全版本汇总"
                : "全版本汇总（" + versionCount + " 个版本）";
        return new AiReviewPromptHealthAggregationScope(MODE_TEMPLATE, null, versionCount, label);
    }

    public static AiReviewPromptHealthAggregationScope versionScope(
            Long templateVersionId, Integer versionNo, String templateName) {
        String versionLabel = versionNo == null ? "版本" : "v" + versionNo;
        String name = templateName == null || templateName.isBlank() ? "" : " · " + templateName.trim();
        return new AiReviewPromptHealthAggregationScope(
                MODE_VERSION,
                templateVersionId,
                1,
                versionLabel + name);
    }
}
