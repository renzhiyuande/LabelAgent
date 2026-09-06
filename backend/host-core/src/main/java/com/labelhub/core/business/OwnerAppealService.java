package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealBatchCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealBatchOperationSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealDecisionCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealDetail;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealSummary;
import com.labelhub.core.lowcode.query.ParsedListQuery;

public interface OwnerAppealService {
    PageResponse<SubmissionAppealSummary> listAppeals(ParsedListQuery query);

    SubmissionAppealDetail getAppeal(Long appealId);

    SubmissionAppealSummary decideAppeal(Long appealId, SubmissionAppealDecisionCommand command);

    SubmissionAppealBatchOperationSummary batchDecideAppeals(SubmissionAppealBatchCommand command,
            SubmissionAppealDecisionCommand decisionCommand);
}
