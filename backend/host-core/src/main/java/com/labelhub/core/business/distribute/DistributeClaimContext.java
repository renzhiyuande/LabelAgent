package com.labelhub.core.business.distribute;

/**
 * claim 门禁上下文。
 *
 * @param taskId        目标任务
 * @param viaClaimToken 是否经凭证兑换路径进入（true=凭证兑换，false=工作台直连）
 */
public record DistributeClaimContext(Long taskId, boolean viaClaimToken) {
}
