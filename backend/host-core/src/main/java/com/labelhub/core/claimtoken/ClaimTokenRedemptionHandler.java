package com.labelhub.core.claimtoken;

/**
 * 抢单凭证兑换处理器：按 scene 注册，与凭证模块解耦，仅通过 scene + payload 关联业务。
 */
public interface ClaimTokenRedemptionHandler {
    /** 支持的场景码，如 {@link ClaimTokenScenes#LABELER_MARKET} */
    String scene();

    /**
     * 原子消费凭证后执行业务。实现方负责权限、事务与幂等语义。
     *
     * @return 业务结果，由 API 层原样放入统一响应 data
     */
    Object redeem(ClaimTokenRecord record);
}
