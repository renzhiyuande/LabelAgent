package com.labelhub.infra.business.distribute;

import com.labelhub.core.business.distribute.DistributeClaimContext;
import com.labelhub.core.business.distribute.DistributePublishContext;
import com.labelhub.core.business.distribute.DistributeStrategy;
import com.labelhub.core.business.distribute.TaskDistributeStrategy;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.infra.business.assignment.support.AssignmentPreseedService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** 配额抢单：发布预生成进广场，但领取必须经凭证（库存闸门），直连一律拒绝。 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class QuotaStrategy implements TaskDistributeStrategy {
    private final AssignmentPreseedService assignmentPreseedService;

    public QuotaStrategy(AssignmentPreseedService assignmentPreseedService) {
        this.assignmentPreseedService = assignmentPreseedService;
    }

    @Override
    public String code() {
        return DistributeStrategy.QUOTA;
    }

    @Override
    public String label() {
        return "配额抢单";
    }

    @Override
    public void onPublish(DistributePublishContext ctx) {
        assignmentPreseedService.ensureUnclaimedAssignmentsForTask(ctx.taskId());
    }

    @Override
    public void checkClaimable(DistributeClaimContext ctx) {
        if (!ctx.viaClaimToken()) {
            throw new BusinessException(ErrorCode.LABELER_CLAIM_TOKEN_REQUIRED,
                    "该任务为配额抢单，请通过领取凭证抢单");
        }
    }
}
