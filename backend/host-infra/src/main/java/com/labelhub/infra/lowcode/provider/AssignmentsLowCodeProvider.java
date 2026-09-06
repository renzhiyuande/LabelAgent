package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.AssignmentService;
import com.labelhub.core.business.BusinessDtos.AssignmentSummary;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.query.spec.AssignmentQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AssignmentsLowCodeProvider extends AbstractLowCodeProvider<AssignmentSummary> {
    private final AssignmentService assignmentService;

    public AssignmentsLowCodeProvider(AssignmentService assignmentService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.assignmentService = assignmentService;
    }

    @Override
    public String resourceKey() {
        return "assignments";
    }

    @Override
    public String label() {
        return "任务分配";
    }

    @Override
    public Class<AssignmentSummary> summaryType() {
        return AssignmentSummary.class;
    }

    @Override
    public PageResponse<AssignmentSummary> query(ListQuery query) {
        return assignmentService.listAssignments(querySupport.parse(query, AssignmentQuerySpec.build()));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of(
                "claim", id -> assignmentService.claimAssignment(id),
                "submit", id -> assignmentService.submitAssignment(id),
                "reopen", id -> assignmentService.reopenAssignment(id),
                "cancel", id -> assignmentService.cancelAssignment(id, ""));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeBulkResourceAction> bulkActions() {
        return Map.of(
                "batchCancel",
                ids -> ids.forEach(id -> assignmentService.cancelAssignment(id, "")));
    }
}
