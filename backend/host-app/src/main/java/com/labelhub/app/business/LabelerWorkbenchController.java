package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.LabelerClaimBatchResult;
import com.labelhub.core.business.BusinessDtos.LabelerClaimResult;
import com.labelhub.core.business.BusinessDtos.LabelerMarketTaskSummary;
import com.labelhub.core.business.BusinessDtos.LabelerMyTaskDetail;
import com.labelhub.core.business.BusinessDtos.LabelerMyTaskRow;
import com.labelhub.core.business.BusinessDtos.LabelerMyWorkRow;
import com.labelhub.core.business.BusinessDtos.LabelerWorkDetail;
import com.labelhub.core.business.BusinessDtos.LabelerWorkSession;
import com.labelhub.core.business.BusinessDtos.SubmissionDetail;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealBatchCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealBatchOperationSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionAppealSummary;
import com.labelhub.core.business.BusinessDtos.SubmissionDraftSaveCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionSubmitCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.core.business.BusinessDtos.LabelerTaskItemDetail;
import com.labelhub.core.business.LabelerWorkbenchService;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.lowcode.query.FilterOperator;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/labeler")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LabelerWorkbenchController {
    private final LabelerWorkbenchService labelerWorkbenchService;
    private final com.labelhub.infra.business.review.service.OwnerAiReviewQueryService ownerAiReviewQueryService;

    public LabelerWorkbenchController(
            LabelerWorkbenchService labelerWorkbenchService,
            com.labelhub.infra.business.review.service.OwnerAiReviewQueryService ownerAiReviewQueryService) {
        this.labelerWorkbenchService = labelerWorkbenchService;
        this.ownerAiReviewQueryService = ownerAiReviewQueryService;
    }

    @GetMapping("/market")
    public ApiResponse<PageResponse<LabelerMarketTaskSummary>> listMarket(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "12") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sceneCode) {
        return ok(labelerWorkbenchService.listMarket(buildQuery(page, pageSize, keyword, sceneCode, null, null)));
    }

    @GetMapping("/market/{id}")
    public ApiResponse<LabelerMarketTaskSummary> getMarketTask(@PathVariable("id") Long taskId) {
        return ok(labelerWorkbenchService.getMarketTask(taskId));
    }

    @PostMapping("/tasks/{taskId}/claim")
    public ApiResponse<LabelerClaimResult> claimTask(@PathVariable Long taskId) {
        return ok(labelerWorkbenchService.claimTask(taskId));
    }

    @PostMapping("/tasks/{taskId}/claim-batch")
    public ApiResponse<LabelerClaimBatchResult> claimTaskBatch(
            @PathVariable Long taskId,
            @RequestParam(name = "count", required = false) Integer count) {
        return ok(labelerWorkbenchService.claimTaskBatch(taskId, count));
    }

    @GetMapping("/my-tasks")
    public ApiResponse<PageResponse<LabelerMyTaskRow>> listMyTasks(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "12") int pageSize,
            @RequestParam(required = false) String keyword) {
        return ok(labelerWorkbenchService.listMyTasks(buildQuery(page, pageSize, keyword, null, null, null)));
    }

    @GetMapping("/my-tasks/{taskId}")
    public ApiResponse<LabelerMyTaskDetail> getMyTask(@PathVariable Long taskId) {
        return ok(labelerWorkbenchService.getMyTask(taskId));
    }

    @GetMapping("/my-works")
    public ApiResponse<PageResponse<LabelerMyWorkRow>> listMyWorks(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long taskId) {
        return ok(labelerWorkbenchService.listMyWorks(buildQuery(page, pageSize, keyword, null, null, taskId)));
    }

    @GetMapping("/submissions/drafts")
    public ApiResponse<PageResponse<SubmissionSummary>> listDraftSubmissions(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        return ok(labelerWorkbenchService.listDraftSubmissions(buildQuery(page, pageSize, keyword, null, null, null)));
    }

    @GetMapping("/submissions/drafts/{submissionId}")
    public ApiResponse<SubmissionDetail> getDraftSubmission(@PathVariable Long submissionId) {
        return ok(labelerWorkbenchService.getDraftSubmission(submissionId));
    }

    @GetMapping("/submissions/history")
    public ApiResponse<PageResponse<SubmissionSummary>> listSubmittedHistory(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        return ok(labelerWorkbenchService.listSubmittedHistory(buildQuery(page, pageSize, keyword, null, null, null)));
    }

    @GetMapping("/submissions/history/{submissionId}")
    public ApiResponse<SubmissionDetail> getSubmissionHistory(@PathVariable Long submissionId) {
        return ok(labelerWorkbenchService.getSubmissionHistory(submissionId));
    }

    @GetMapping("/assignments/{assignmentId}/work")
    public ApiResponse<LabelerWorkDetail> loadWork(@PathVariable Long assignmentId) {
        return ok(labelerWorkbenchService.loadWork(assignmentId));
    }

    @GetMapping("/assignments/{assignmentId}/item")
    public ApiResponse<LabelerTaskItemDetail> getAssignmentTaskItem(@PathVariable Long assignmentId) {
        return ok(labelerWorkbenchService.getAssignmentTaskItem(assignmentId));
    }

    @GetMapping("/assignments/{assignmentId}/work-session")
    public ApiResponse<LabelerWorkSession> loadWorkSessionForAssignment(
            @PathVariable Long assignmentId,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        return ok(labelerWorkbenchService.loadWorkSessionForAssignment(
                assignmentId,
                buildQuery(page, pageSize, null, null, null, null)));
    }

    @GetMapping("/tasks/{taskId}/work-session")
    public ApiResponse<LabelerWorkSession> loadWorkSession(
            @PathVariable Long taskId,
            @RequestParam(required = false) Long assignmentId,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        return ok(labelerWorkbenchService.loadWorkSession(
                taskId,
                assignmentId,
                buildQuery(page, pageSize, null, null, null, taskId)));
    }

    @PutMapping("/submissions/{submissionId}/draft")
    public ApiResponse<SubmissionSummary> saveDraft(
            @PathVariable Long submissionId, @Valid @RequestBody SubmissionDraftSaveCommand command) {
        return ok(labelerWorkbenchService.saveSubmissionDraft(submissionId, command));
    }

    @PostMapping("/submissions/{submissionId}/submit")
    public ApiResponse<SubmissionSummary> submit(
            @PathVariable Long submissionId, @RequestBody(required = false) SubmissionSubmitCommand command) {
        SubmissionSubmitCommand payload = command == null
                ? new SubmissionSubmitCommand(java.util.Map.of(), null)
                : command;
        return ok(labelerWorkbenchService.submitSubmission(submissionId, payload));
    }

    @PostMapping("/submissions/{submissionId}/withdraw")
    public ApiResponse<SubmissionSummary> withdraw(@PathVariable Long submissionId) {
        return ok(labelerWorkbenchService.withdrawSubmission(submissionId));
    }

    @PostMapping("/submissions/{submissionId}/appeal")
    public ApiResponse<SubmissionAppealSummary> appeal(
            @PathVariable Long submissionId,
            @Valid @RequestBody SubmissionAppealCommand command) {
        return ok(labelerWorkbenchService.submitAppeal(submissionId, command));
    }

    @PostMapping("/submissions/appeals/batch")
    public ApiResponse<SubmissionAppealBatchOperationSummary> batchAppeal(
            @Valid @RequestBody SubmissionAppealBatchCommand command) {
        return ok(labelerWorkbenchService.batchSubmitAppeals(command));
    }

    @GetMapping("/submissions/{submissionId}/ai-review")
    @RequireAnyPermission({ "system:admin", "business:labeler:workbench" })
    public ApiResponse<com.labelhub.core.review.AiReviewOwnerSummary> getAiReview(
            @PathVariable Long submissionId) {
        return ok(ownerAiReviewQueryService.queryLatestReviewForLabeler(submissionId));
    }

    private ParsedListQuery buildQuery(int page, int pageSize, String keyword, String sceneCode, String status, Long taskId) {
        List<ParsedFilter> filters = new ArrayList<>();
        if (sceneCode != null && !sceneCode.isBlank()) {
            filters.add(new ParsedFilter("sceneCode", FilterOperator.EQ, sceneCode));
        }
        if (status != null && !status.isBlank()) {
            filters.add(new ParsedFilter("status", FilterOperator.EQ, status));
        }
        if (taskId != null) {
            filters.add(new ParsedFilter("taskId", FilterOperator.EQ, taskId));
        }
        return new ParsedListQuery(page, pageSize, keyword, filters, List.of());
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
