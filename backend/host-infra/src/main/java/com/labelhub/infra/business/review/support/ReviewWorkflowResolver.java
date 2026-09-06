package com.labelhub.infra.business.review.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class ReviewWorkflowResolver {
    private static final List<ReviewWorkflowLevel> DEFAULT_DEFINITION =
            List.of(new ReviewWorkflowLevel("L1", "初审", List.of("approve", "reject", "return")));

    private static final Map<String, String> DEFAULT_LABELS = Map.of(
            "L1", "初审",
            "L2", "复审",
            "L3", "终审");

    private final ObjectMapper objectMapper;

    public ReviewWorkflowResolver(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<ReviewWorkflowLevel> parseDefinition(String reviewWorkflowJson) {
        if (reviewWorkflowJson == null || reviewWorkflowJson.isBlank()) {
            return DEFAULT_DEFINITION;
        }
        try {
            JsonNode root = objectMapper.readTree(reviewWorkflowJson);
            if (!root.has("levels") || !root.get("levels").isArray()) {
                return DEFAULT_DEFINITION;
            }
            List<ReviewWorkflowLevel> levels = parseLevelsArray(root.get("levels"));
            return levels.isEmpty() ? DEFAULT_DEFINITION : List.copyOf(levels);
        } catch (Exception ignored) {
            return DEFAULT_DEFINITION;
        }
    }

    public List<String> parseLevels(String reviewWorkflowJson) {
        return parseDefinition(reviewWorkflowJson).stream().map(ReviewWorkflowLevel::key).toList();
    }

    public String labelFor(String reviewWorkflowJson, String levelKey) {
        return parseDefinition(reviewWorkflowJson).stream()
                .filter(level -> level.key().equals(levelKey))
                .map(ReviewWorkflowLevel::label)
                .findFirst()
                .orElse(defaultLabel(levelKey));
    }

    public boolean allowsAction(String reviewWorkflowJson, String levelKey, String action) {
        if (!StringUtils.hasText(action)) {
            return false;
        }
        String normalizedAction = action.trim().toLowerCase(Locale.ROOT);
        return parseDefinition(reviewWorkflowJson).stream()
                .filter(level -> level.key().equals(levelKey))
                .anyMatch(level -> level.actions().contains(normalizedAction));
    }

    public String firstLevel(String reviewWorkflowJson) {
        return parseLevels(reviewWorkflowJson).getFirst();
    }

    public String nextLevel(String reviewWorkflowJson, String currentLevel) {
        List<String> levels = parseLevels(reviewWorkflowJson);
        int idx = levels.indexOf(currentLevel);
        if (idx < 0 || idx >= levels.size() - 1) {
            return null;
        }
        return levels.get(idx + 1);
    }

    public boolean isFinalLevel(String reviewWorkflowJson, String currentLevel) {
        List<String> levels = parseLevels(reviewWorkflowJson);
        return !levels.isEmpty() && levels.getLast().equals(currentLevel);
    }

    public int stageNo(String reviewWorkflowJson, String level) {
        List<String> levels = parseLevels(reviewWorkflowJson);
        int idx = levels.indexOf(level);
        return idx < 0 ? 1 : idx + 1;
    }

    private List<ReviewWorkflowLevel> parseLevelsArray(JsonNode levelsNode) {
        List<ReviewWorkflowLevel> result = new ArrayList<>();
        for (JsonNode item : levelsNode) {
            if (item.isTextual()) {
                String key = item.asText().trim();
                if (!key.isEmpty()) {
                    result.add(new ReviewWorkflowLevel(key, defaultLabel(key), List.of("approve", "reject", "return")));
                }
                continue;
            }
            if (!item.isObject()) {
                continue;
            }
            String key = readText(item, "key");
            if (!StringUtils.hasText(key)) {
                continue;
            }
            String label = readText(item, "label");
            if (!StringUtils.hasText(label)) {
                label = defaultLabel(key);
            }
            result.add(new ReviewWorkflowLevel(key, label, readActions(item)));
        }
        return result;
    }

    private static List<String> readActions(JsonNode item) {
        if (!item.has("actions") || !item.get("actions").isArray()) {
            return List.of("approve", "reject", "return");
        }
        List<String> actions = new ArrayList<>();
        for (JsonNode actionNode : item.get("actions")) {
            if (actionNode.isTextual()) {
                String action = actionNode.asText().trim().toLowerCase(Locale.ROOT);
                if (!action.isEmpty()) {
                    actions.add(action);
                }
            }
        }
        return actions.isEmpty() ? List.of("approve", "reject", "return") : actions;
    }

    private static String readText(JsonNode node, String field) {
        if (!node.has(field) || node.get(field).isNull()) {
            return null;
        }
        return node.get(field).asText();
    }

    private static String defaultLabel(String key) {
        return DEFAULT_LABELS.getOrDefault(key, key);
    }
}
