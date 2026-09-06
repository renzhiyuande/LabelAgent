package com.labelhub.core.review;

import java.util.List;
import java.util.Map;

public record AiReviewContext(
        Long submissionId,
        Long submissionVersionId,
        Long taskId,
        Long assignmentId,
        Integer reviewRoundNo,
        String platformKey,
        String modelId,
        String promptTemplate,
        String outputSchemaJson,
        Map<String, Object> submitData,
        Map<String, Object> itemPayload,
        List<AiReviewDimensionSpec> dimensions,
        List<Map<String, Object>> memoryContext) {

    public record AiReviewDimensionSpec(
            String dimensionKey,
            String dimensionName,
            java.math.BigDecimal weight,
            java.math.BigDecimal scoreMin,
            java.math.BigDecimal scoreMax,
            java.math.BigDecimal passThreshold,
            java.math.BigDecimal rejectThreshold,
            String promptInstruction) {
    }
}
