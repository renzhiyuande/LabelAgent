package com.labelhub.infra.business.distribute;

import com.labelhub.core.business.distribute.DistributeClaimContext;
import com.labelhub.core.business.distribute.DistributePublishContext;
import com.labelhub.core.business.distribute.DistributeStrategy;
import com.labelhub.core.business.distribute.TaskDistributeStrategy;
import com.labelhub.infra.business.assignment.support.AssignmentPreseedService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** 先到先得：发布预生成进广场，领取放行（并发安全由 executeClaim 乐观锁保证）。 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class FirstComeStrategy implements TaskDistributeStrategy {
    private final AssignmentPreseedService assignmentPreseedService;

    public FirstComeStrategy(AssignmentPreseedService assignmentPreseedService) {
        this.assignmentPreseedService = assignmentPreseedService;
    }

    @Override
    public String code() {
        return DistributeStrategy.FIRST_COME;
    }

    @Override
    public String label() {
        return "先到先得";
    }

    @Override
    public void onPublish(DistributePublishContext ctx) {
        assignmentPreseedService.ensureUnclaimedAssignmentsForTask(ctx.taskId());
    }

    @Override
    public void checkClaimable(DistributeClaimContext ctx) {
        // 放行
    }
}
