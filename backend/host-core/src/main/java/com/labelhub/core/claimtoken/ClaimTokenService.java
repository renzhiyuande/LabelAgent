package com.labelhub.core.claimtoken;

import java.util.Map;

/**
 * 一次性抢单凭证：先签发 token，再凭 token 兑换；每个 token 仅能成功兑换一次。
 */
public interface ClaimTokenService {
    ClaimTokenIssueResult issue(String scene, Long userId, Map<String, Object> payload);

    ClaimTokenRedemptionResult redeem(String token, Long userId);
}
