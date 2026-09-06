package com.labelhub.core.business;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.lowcode.query.ParsedListQuery;

public interface LabelerWorkbenchService {
    PageResponse<LabelerMarketTaskSummary> listMarket(ParsedListQuery query);

    LabelerMarketTaskSummary getMarketTask(Long taskId);

    LabelerClaimResult claimTask(Long taskId);

    LabelerClaimBatchResult claimTaskBatch(Long taskId, Integer requestedCount);

    PageResponse<LabelerMyWorkRow> listMyWorks(ParsedListQuery query);

    PageResponse<LabelerMyTaskRow> listMyTasks(ParsedListQuery query);

    LabelerMyTaskDetail getMyTask(Long taskId);

    PageResponse<SubmissionSummary> listDraftSubmissions(ParsedListQuery query);

    SubmissionDetail getDraftSubmission(Long submissionId);

    PageResponse<SubmissionSummary> listSubmittedHistory(ParsedListQuery query);

    SubmissionDetail getSubmissionHistory(Long submissionId);

    LabelerWorkDetail loadWork(Long assignmentId);

    LabelerTaskItemDetail getAssignmentTaskItem(Long assignmentId);

    LabelerWorkSession loadWorkSession(Long taskId, Long assignmentId, ParsedListQuery query);

    LabelerWorkSession loadWorkSessionForAssignment(Long assignmentId, ParsedListQuery query);

    SubmissionSummary saveSubmissionDraft(Long submissionId, SubmissionDraftSaveCommand command);

    SubmissionSummary submitSubmission(Long submissionId, SubmissionSubmitCommand command);

    SubmissionSummary withdrawSubmission(Long submissionId);

    SubmissionAppealSummary submitAppeal(Long submissionId, SubmissionAppealCommand command);

    SubmissionAppealBatchOperationSummary batchSubmitAppeals(SubmissionAppealBatchCommand command);
}
