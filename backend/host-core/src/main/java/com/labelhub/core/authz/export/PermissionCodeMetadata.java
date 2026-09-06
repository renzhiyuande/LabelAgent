package com.labelhub.core.authz.export;

import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

public final class PermissionCodeMetadata {

    private PermissionCodeMetadata() {
    }

    public static String moduleCode(String permissionCode) {
        int colon = permissionCode.indexOf(':');
        if (colon <= 0) {
            return "SYSTEM";
        }
        return permissionCode.substring(0, colon).toUpperCase(Locale.ROOT);
    }

    public static String permissionName(String permissionCode) {
        String[] parts = permissionCode.split(":");
        if (parts.length <= 1) {
            return humanizeSegment(permissionCode);
        }
        return Arrays.stream(parts, 1, parts.length)
                .map(PermissionCodeMetadata::humanizeSegment)
                .collect(Collectors.joining(" "));
    }

    private static String humanizeSegment(String segment) {
        if (segment == null || segment.isBlank()) {
            return segment;
        }
        String[] tokens = segment.split("[-_]");
        return Arrays.stream(tokens)
                .filter(token -> !token.isBlank())
                .map(token -> Character.toUpperCase(token.charAt(0)) + token.substring(1).toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
    }
}
