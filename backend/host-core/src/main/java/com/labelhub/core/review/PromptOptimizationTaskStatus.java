package com.labelhub.core.review;

import java.time.Instant;

/** Owner 查询模板最近一次手动触发的提示词优化异步任务状态。 */
public record PromptOptimizationTaskStatus(
        Long taskId,
        String status,
        String lastErrorMessage,
        Instant finishedAt,
        String optimizationOutcome,
        String optimizationSummary,
        String notificationBody) {

    public static PromptOptimizationTaskStatus empty() {
        return new PromptOptimizationTaskStatus(null, null, null, null, null, null, null);
    }
}
