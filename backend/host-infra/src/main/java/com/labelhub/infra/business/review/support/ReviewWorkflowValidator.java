package com.labelhub.infra.business.review.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class ReviewWorkflowValidator {

    private static final Pattern LEVEL_KEY = Pattern.compile("^L[1-9]\\d*$");
    private static final Set<String> ALLOWED_ACTIONS = Set.of("approve", "reject", "return");
    private static final int MAX_LEVELS = 5;

    private final ObjectMapper objectMapper;
    private final ReviewWorkflowResolver reviewWorkflowResolver;

    public ReviewWorkflowValidator(ObjectMapper objectMapper, ReviewWorkflowResolver reviewWorkflowResolver) {
        this.objectMapper = objectMapper;
        this.reviewWorkflowResolver = reviewWorkflowResolver;
    }

    public List<ReviewWorkflowLevel> validateLevels(List<ReviewWorkflowLevel> levels) {
        if (levels == null || levels.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "At least one review level is required");
        }
        if (levels.size() > MAX_LEVELS) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Review workflow exceeds max levels: " + MAX_LEVELS);
        }
        Set<String> seenKeys = new LinkedHashSet<>();
        List<ReviewWorkflowLevel> normalized = new ArrayList<>();
        int expectedIndex = 1;
        for (ReviewWorkflowLevel level : levels) {
            String key = level.key() == null ? "" : level.key().trim();
            if (!LEVEL_KEY.matcher(key).matches()) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid review level key: " + key);
            }
            String expectedKey = "L" + expectedIndex;
            if (!expectedKey.equals(key)) {
                throw new BusinessException(
                        ErrorCode.VALIDATION_ERROR,
                        "Review levels must be sequential starting at L1, expected " + expectedKey);
            }
            expectedIndex += 1;
            if (!seenKeys.add(key)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Duplicate review level key: " + key);
            }
            String label = level.label() == null ? "" : level.label().trim();
            if (!StringUtils.hasText(label)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Review level label is required for " + key);
            }
            if (label.length() > 64) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Review level label too long for " + key);
            }
            List<String> actions = normalizeActions(level.actions());
            normalized.add(new ReviewWorkflowLevel(key, label, actions));
        }
        return List.copyOf(normalized);
    }

    public String toJson(List<ReviewWorkflowLevel> levels) {
        List<ReviewWorkflowLevel> validated = validateLevels(levels);
        try {
            List<Map<String, Object>> payload = validated.stream()
                    .map(level -> Map.<String, Object>of(
                            "key", level.key(),
                            "label", level.label(),
                            "actions", level.actions()))
                    .toList();
            return objectMapper.writeValueAsString(Map.of("levels", payload));
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Failed to serialize review workflow");
        }
    }

    public String validateAndSerializeJson(String reviewWorkflowJson) {
        if (reviewWorkflowJson == null || reviewWorkflowJson.isBlank()) {
            return toJson(List.of(new ReviewWorkflowLevel("L1", "初审", List.of("approve", "reject", "return"))));
        }
        try {
            return toJson(reviewWorkflowResolver.parseDefinition(reviewWorkflowJson));
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid review_workflow_json");
        }
    }

    @SuppressWarnings("unchecked")
    public String validateAndSerializeFromMap(Map<String, Object> workflow) {
        if (workflow == null || workflow.isEmpty()) {
            return validateAndSerializeJson(null);
        }
        Object levelsNode = workflow.get("levels");
        if (!(levelsNode instanceof List<?> rawLevels) || rawLevels.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "人工审核流程须至少配置一级");
        }
        List<ReviewWorkflowLevel> levels = new ArrayList<>();
        int expectedIndex = 1;
        for (Object raw : rawLevels) {
            if (!(raw instanceof Map<?, ?> levelMap)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "人工审核级别格式无效");
            }
            String key = readMapText(levelMap, "key");
            if (!StringUtils.hasText(key)) {
                key = "L" + expectedIndex;
            }
            String label = readMapText(levelMap, "label");
            List<String> actions = readMapActions(levelMap.get("actions"));
            levels.add(new ReviewWorkflowLevel(key, label, actions));
            expectedIndex += 1;
        }
        return toJson(levels);
    }

    private static String readMapText(Map<?, ?> map, String field) {
        Object value = map.get(field);
        if (value == null) {
            return "";
        }
        return String.valueOf(value).trim();
    }

    @SuppressWarnings("unchecked")
    private static List<String> readMapActions(Object actionsNode) {
        if (!(actionsNode instanceof List<?> rawActions)) {
            return List.of();
        }
        return rawActions.stream()
                .filter(item -> item != null && !String.valueOf(item).isBlank())
                .map(item -> String.valueOf(item).trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toList());
    }

    private List<String> normalizeActions(List<String> actions) {
        if (actions == null || actions.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Each review level requires at least one action");
        }
        List<String> normalized = new ArrayList<>();
        for (String action : actions) {
            if (!StringUtils.hasText(action)) {
                continue;
            }
            String value = action.trim().toLowerCase(Locale.ROOT);
            if (!ALLOWED_ACTIONS.contains(value)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Unsupported review action: " + action);
            }
            if (!normalized.contains(value)) {
                normalized.add(value);
            }
        }
        if (normalized.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Each review level requires at least one action");
        }
        return List.copyOf(normalized);
    }
}
