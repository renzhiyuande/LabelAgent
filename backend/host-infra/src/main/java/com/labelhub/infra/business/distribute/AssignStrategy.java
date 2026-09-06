package com.labelhub.infra.business.distribute;

import com.labelhub.core.business.distribute.DistributeClaimContext;
import com.labelhub.core.business.distribute.DistributePublishContext;
import com.labelhub.core.business.distribute.DistributeStrategy;
import com.labelhub.core.business.distribute.TaskDistributeStrategy;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** 指派模式：发布不预生成（题不进广场），禁止广场自由领取，仅靠 Owner 指派产生 assignment。 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AssignStrategy implements TaskDistributeStrategy {

    @Override
    public String code() {
        return DistributeStrategy.ASSIGN;
    }

    @Override
    public String label() {
        return "指派模式";
    }

    @Override
    public void onPublish(DistributePublishContext ctx) {
        // 跳过 preseed：题不进广场，等指派时再建 assignment
    }

    @Override
    public void checkClaimable(DistributeClaimContext ctx) {
        throw new BusinessException(ErrorCode.LABELER_CLAIM_STRATEGY_FORBIDDEN,
                "该任务为指派模式，不支持广场自由领取");
    }
}
