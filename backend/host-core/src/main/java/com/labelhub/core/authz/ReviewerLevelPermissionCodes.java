package com.labelhub.core.authz;

import java.util.List;

/**
 * Canonical reviewer per-level permission codes (Flyway V37/V55, ids 10022–10026).
 * Registered in {@link com.labelhub.core.authz.export.PermissionCodeCollector} and
 * enforced at runtime by {@code ReviewerReviewLevelAccess}.
 */
public final class ReviewerLevelPermissionCodes {

    /** Matches {@link com.labelhub.infra.business.review.support.ReviewWorkflowValidator} max levels. */
    public static final int MAX_LEVELS = 5;

    public static final String PREFIX = "business:reviewer:level:";

    public static final String L1 = PREFIX + "L1";
    public static final String L2 = PREFIX + "L2";
    public static final String L3 = PREFIX + "L3";
    public static final String L4 = PREFIX + "L4";
    public static final String L5 = PREFIX + "L5";

    private static final List<String> ALL_CODES = List.of(L1, L2, L3, L4, L5);

    private ReviewerLevelPermissionCodes() {
    }

    public static List<String> allCodes() {
        return ALL_CODES;
    }

    public static String codeForLevelKey(String levelKey) {
        if (levelKey == null || levelKey.isBlank()) {
            throw new IllegalArgumentException("levelKey is required");
        }
        return PREFIX + levelKey.trim();
    }

    public static boolean isLevelPermission(String code) {
        return code != null && code.startsWith(PREFIX);
    }
}
