package com.labelhub.core.claimtoken;

import java.time.Instant;
import java.util.Map;

/**
 * 已签发、待兑换的抢单凭证快照（兑换前）。
 */
public record ClaimTokenRecord(
        String token,
        String scene,
        Long userId,
        Map<String, Object> payload,
        Instant issuedAt,
        Instant expiresAt) {
}
