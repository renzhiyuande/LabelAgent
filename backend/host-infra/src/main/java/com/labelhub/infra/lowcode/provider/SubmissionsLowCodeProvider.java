package com.labelhub.infra.lowcode.provider;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.core.business.SubmissionService;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.infra.lowcode.AbstractLowCodeProvider;
import com.labelhub.infra.lowcode.LowCodeQuerySupport;
import com.labelhub.infra.lowcode.query.spec.SubmissionQuerySpec;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SubmissionsLowCodeProvider extends AbstractLowCodeProvider<SubmissionSummary> {
    private final SubmissionService submissionService;

    public SubmissionsLowCodeProvider(SubmissionService submissionService, LowCodeQuerySupport querySupport) {
        super(querySupport);
        this.submissionService = submissionService;
    }

    @Override
    public String resourceKey() {
        return "submissions";
    }

    @Override
    public String label() {
        return "提交记录";
    }

    @Override
    public Class<SubmissionSummary> summaryType() {
        return SubmissionSummary.class;
    }

    @Override
    public PageResponse<SubmissionSummary> query(ListQuery query) {
        return submissionService.listSubmissions(querySupport.parse(query, SubmissionQuerySpec.build()));
    }

    @Override
    public Map<String, com.labelhub.infra.lowcode.LowCodeResourceAction> actions() {
        return Map.of();
    }
}
