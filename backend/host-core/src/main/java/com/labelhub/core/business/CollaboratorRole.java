package com.labelhub.core.business;

import java.util.Locale;
import java.util.Optional;

public enum CollaboratorRole {
    LABELER,
    REVIEWER,
    OWNER;

    public static Optional<CollaboratorRole> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(CollaboratorRole.valueOf(raw.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
