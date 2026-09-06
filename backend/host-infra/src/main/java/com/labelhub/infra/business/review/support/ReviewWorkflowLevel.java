package com.labelhub.infra.business.review.support;

import java.util.List;

/** One human-review stage parsed from task {@code review_workflow_json}. */
public record ReviewWorkflowLevel(String key, String label, List<String> actions) {
    private static final List<String> DEFAULT_ACTIONS = List.of("approve", "reject", "return");

    public ReviewWorkflowLevel {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("review workflow level key is required");
        }
        if (label == null || label.isBlank()) {
            label = key;
        }
        if (actions == null || actions.isEmpty()) {
            actions = DEFAULT_ACTIONS;
        } else {
            actions = actions.stream()
                    .map(action -> action == null ? "" : action.trim().toLowerCase())
                    .filter(action -> !action.isEmpty())
                    .distinct()
                    .toList();
            if (actions.isEmpty()) {
                actions = DEFAULT_ACTIONS;
            }
        }
    }
}
