package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.business.BusinessDtos.AuditPoolLevelCount;
import com.labelhub.core.business.ReviewerWorkbenchService;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.OptionRequest;
import com.labelhub.infra.lowcode.BusinessOptionProvider;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 审核级别选项：来自任务 review_workflow_json（settings），经审核工作台 meta 聚合。
 * 可选 taskId 参数限定到单任务的工作流定义。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ReviewerReviewLevelOptionProvider implements BusinessOptionProvider {
    private final ReviewerWorkbenchService reviewerWorkbenchService;

    public ReviewerReviewLevelOptionProvider(ReviewerWorkbenchService reviewerWorkbenchService) {
        this.reviewerWorkbenchService = reviewerWorkbenchService;
    }

    @Override
    public String optionKey() {
        return "reviewerReviewLevels";
    }

    @Override
    public String optionLabel() {
        return "审核级别";
    }

    @Override
    public String[] requiredPermissions() {
        return new String[] { "business:reviewer:workbench", "system:admin" };
    }

    @Override
    public List<OptionItem> options(OptionRequest request) {
        Long taskId = parseTaskId(request.get("taskId"));
        return reviewerWorkbenchService.listReviewLevelOptions(taskId).stream()
                .map(ReviewerReviewLevelOptionProvider::toOptionItem)
                .toList();
    }

    @Override
    public List<OptionItem> options(String role, String keyword) {
        return options(OptionRequest.of(java.util.Map.of()));
    }

    private static OptionItem toOptionItem(AuditPoolLevelCount level) {
        String label = level.levelLabel() != null && !level.levelLabel().isBlank()
                ? level.levelLabel()
                : level.levelKey();
        return new OptionItem(label, level.levelKey());
    }

    private static Long parseTaskId(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            long value = Long.parseLong(raw.trim());
            return value > 0 ? value : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
