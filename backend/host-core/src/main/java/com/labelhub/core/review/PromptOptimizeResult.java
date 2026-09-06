package com.labelhub.core.review;

import java.util.List;

/**
 * Python Agent {@code POST /v1/prompt-optimize} 响应 DTO。
 */
public record PromptOptimizeResult(
        String candidatePromptTemplate,
        String changeSummary,
        List<String> targetedMisalignmentTypes,
        String riskNotes,
        List<PromptDiffHint> promptDiffHints) {

    public record PromptDiffHint(String section, String change) {
    }
}
