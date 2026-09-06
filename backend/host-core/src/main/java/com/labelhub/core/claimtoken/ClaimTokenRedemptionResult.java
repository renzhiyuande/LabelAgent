package com.labelhub.core.claimtoken;

/**
 * @param scene   业务场景
 * @param payload 各场景 Handler 返回的业务结果（如 LabelerClaimBatchResult）
 */
public record ClaimTokenRedemptionResult(String scene, Object payload) {
}
