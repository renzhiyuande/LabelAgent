package com.labelhub.core.review;

import java.util.List;

/**
 * AI 预审提示词优化建议服务接口。
 */
public interface AiReviewPromptSuggestionService {

    List<AiReviewPromptSuggestion> list(Long templateId);

    AiReviewPromptSuggestion getDetail(Long suggestionId);

    AiReviewPromptSuggestion accept(Long suggestionId);

    AiReviewPromptSuggestion dismiss(Long suggestionId, String dismissReason);

    void triggerOptimization(Long templateVersionId);

    /** 根据模板 ID 解析当前版本并手动触发提示词优化异步任务。 */
    void triggerOptimizationForTemplate(Long templateId);

    /** 查询该模板当前版本最近一次手动触发的优化任务状态。 */
    PromptOptimizationTaskStatus getLatestManualOptimizationTask(Long templateId);
}
