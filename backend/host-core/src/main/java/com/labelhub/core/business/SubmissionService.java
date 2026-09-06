package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import java.util.List;

public interface SubmissionService {
    PageResponse<SubmissionSummary> listSubmissions(ParsedListQuery query);

    List<SubmissionAttemptSummary> listAttemptsByAssignment(Long assignmentId);

    SubmissionDetail getSubmissionDetail(Long submissionId);

    SubmissionSummary createDraft(Long assignmentId);

    SubmissionSummary saveDraft(Long submissionId, SubmissionDraftSaveCommand command);

    SubmissionSummary submit(Long submissionId, SubmissionSubmitCommand command);
}
