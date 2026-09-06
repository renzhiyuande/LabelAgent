package com.labelhub.infra.claimtoken;

import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.LabelerClaimBatchResult;
import com.labelhub.core.claimtoken.ClaimTokenPayloadSupport;
import com.labelhub.core.claimtoken.ClaimTokenRecord;
import com.labelhub.core.claimtoken.ClaimTokenRedemptionHandler;
import com.labelhub.core.claimtoken.ClaimTokenScenes;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.task.workflow.LabelerClaimExecutor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 任务广场抢单场景适配：凭证 payload 为 {@code { "taskId": number, "count": number? }}。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LabelerMarketClaimTokenHandler implements ClaimTokenRedemptionHandler {
    private final LabelerClaimExecutor labelerClaimExecutor;

    public LabelerMarketClaimTokenHandler(LabelerClaimExecutor labelerClaimExecutor) {
        this.labelerClaimExecutor = labelerClaimExecutor;
    }

    @Override
    public String scene() {
        return ClaimTokenScenes.LABELER_MARKET;
    }

    @Override
    @Transactional
    @RequireAnyPermission({ "business:labeler:workbench", "system:admin" })
    public Object redeem(ClaimTokenRecord record) {
        Long taskId = ClaimTokenPayloadSupport.readLong(record.payload(), "taskId");
        if (taskId == null || taskId < 1) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "payload.taskId is required");
        }
        Integer count = ClaimTokenPayloadSupport.readInt(record.payload(), "count");
        return labelerClaimExecutor.executeClaim(record.userId(), taskId, count, true);
    }
}
