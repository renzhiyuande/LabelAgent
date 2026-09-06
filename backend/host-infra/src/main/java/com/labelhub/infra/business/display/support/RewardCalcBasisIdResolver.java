package com.labelhub.infra.business.display.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.infra.persistence.entity.RewardSettlementDetailEntity;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class RewardCalcBasisIdResolver {
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;

    public RewardCalcBasisIdResolver(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ResolvedCalcBasisIds resolve(RewardSettlementDetailEntity detail) {
        Map<String, Object> basis = parseCalcBasisJson(detail.getCalcBasisJson());
        return new ResolvedCalcBasisIds(
                firstLong(basis, "taskId", "task_id", detail.getTaskId()),
                firstLong(basis, "submissionId", "submission_id", detail.getSubmissionId()),
                firstLong(basis, "submissionVersionId", "submission_version_id", detail.getSubmissionVersionId()),
                firstLong(basis, "assignmentId", "assignment_id", detail.getAssignmentId()));
    }

    private Map<String, Object> parseCalcBasisJson(String calcBasisJson) {
        if (!StringUtils.hasText(calcBasisJson)) {
            return Map.of();
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(calcBasisJson, MAP_TYPE);
            return parsed != null ? parsed : Map.of();
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private static Long firstLong(Map<String, Object> basis, String primaryKey, String fallbackKey, Long rowFallback) {
        Long fromBasis = toLong(basis.get(primaryKey));
        if (fromBasis != null) {
            return fromBasis;
        }
        fromBasis = toLong(basis.get(fallbackKey));
        if (fromBasis != null) {
            return fromBasis;
        }
        return rowFallback;
    }

    private static Long toLong(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number number) {
            return number.longValue();
        }
        String text = raw.toString().trim();
        if (!StringUtils.hasText(text)) {
            return null;
        }
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    public record ResolvedCalcBasisIds(
            Long taskId,
            Long submissionId,
            Long submissionVersionId,
            Long assignmentId) {
    }
}
