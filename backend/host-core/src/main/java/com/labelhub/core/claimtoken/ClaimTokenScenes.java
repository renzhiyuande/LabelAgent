package com.labelhub.core.claimtoken;

/**
 * 抢单凭证业务场景码。模块只识别 scene 字符串，具体语义由 RedemptionHandler 实现。
 */
public final class ClaimTokenScenes {
    public static final String LABELER_MARKET = "labeler.market";

    private ClaimTokenScenes() {
    }
}
