package com.labelhub.core.claimtoken;

import java.time.Instant;

public record ClaimTokenIssueResult(
        String token,
        String scene,
        Instant expiresAt,
        /** 签发时预占的题目数量（未启用预占或未知场景时为 null） */
        Integer reservedCount) {
}
