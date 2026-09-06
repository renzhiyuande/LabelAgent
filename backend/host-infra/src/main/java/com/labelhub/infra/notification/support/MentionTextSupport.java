package com.labelhub.infra.notification.support;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class MentionTextSupport {
    private static final Pattern MENTION_TOKEN = Pattern.compile("@([^\\s@]+)");

    private MentionTextSupport() {}

    public static List<String> extractMentionLabels(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        Set<String> labels = new LinkedHashSet<>();
        Matcher matcher = MENTION_TOKEN.matcher(text);
        while (matcher.find()) {
            String label = matcher.group(1);
            if (label != null && !label.isBlank()) {
                labels.add(label.trim());
            }
        }
        return new ArrayList<>(labels);
    }
}
