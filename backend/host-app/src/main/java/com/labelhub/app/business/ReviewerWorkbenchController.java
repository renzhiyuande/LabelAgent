package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.AiQueueStatsSummary;
import com.labelhub.core.business.BusinessDtos.AiQueueStatusCounts;
import com.labelhub.core.business.BusinessDtos.ReviewBatchOperationRow;
import com.labelhub.core.business.BusinessDtos.ReviewerAiQueueAdvanceCommand;
import com.labelhub.core.business.BusinessDtos.ReviewerBatchDecisionCommand;
import com.labelhub.core.business.BusinessDtos.ReviewerBatchSubmitResult;
import com.labelhub.core.business.BusinessDtos.ReviewerDecisionCommand;
import com.labelhub.core.business.BusinessDtos.AuditPoolGroupRow;
import com.labelhub.core.business.BusinessDtos.AuditPoolMetaSummary;
import com.labelhub.core.business.BusinessDtos.ReviewerQueueRow;
import com.labelhub.core.business.BusinessDtos.ReviewerReviewRecordDetail;
import com.labelhub.core.business.BusinessDtos.ReviewerReviewRecordListRow;
import com.labelhub.core.business.BusinessDtos.ReviewerReviewRecordRow;
import com.labelhub.core.business.BusinessDtos.ReviewerSubmissionDetail;
import com.labelhub.core.business.ReviewerWorkbenchService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reviewer")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ReviewerWorkbenchController {
    private final ReviewerWorkbenchService reviewerWorkbenchService;

    public ReviewerWorkbenchController(ReviewerWorkbenchService reviewerWorkbenchService) {
        this.reviewerWorkbenchService = reviewerWorkbenchService;
    }

    @GetMapping("/ai-queue")
    public ApiResponse<PageResponse<ReviewerQueueRow>> listAiQueue(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status) {
        return ok(reviewerWorkbenchService.listAiQueue(buildQuery(page, pageSize, keyword), status));
    }

    @GetMapping("/ai-queue/stats")
    public ApiResponse<AiQueueStatsSummary> listAiQueueStats(@RequestParam(required = false) Long taskId) {
        return ok(reviewerWorkbenchService.listAiQueueStats(taskId));
    }

    @GetMapping("/ai-queue/status-counts")
    public ApiResponse<AiQueueStatusCounts> listAiQueueStatusCounts() {
        return ok(reviewerWorkbenchService.listAiQueueStatusCounts());
    }

    @PostMapping("/ai-queue/{submissionId}/retry-ai-review")
    public ApiResponse<ReviewerSubmissionDetail> retryAiQueueReview(@PathVariable Long submissionId) {
        return ok(reviewerWorkbenchService.retryAiQueueReview(submissionId));
    }

    @GetMapping("/ai-queue/{submissionId}")
    public ApiResponse<ReviewerSubmissionDetail> getAiQueueDetail(@PathVariable Long submissionId) {
        return ok(reviewerWorkbenchService.getAiQueueDetail(submissionId));
    }

    @PostMapping("/ai-queue/{submissionId}/advance")
    public ApiResponse<ReviewerSubmissionDetail> advanceAiQueue(
            @PathVariable Long submissionId, @Valid @RequestBody ReviewerAiQueueAdvanceCommand command) {
        return ok(reviewerWorkbenchService.advanceAiQueue(submissionId, command));
    }

    @GetMapping("/audit-pool/meta")
    public ApiResponse<AuditPoolMetaSummary> getAuditPoolMeta(@RequestParam(required = false) Long taskId) {
        return ok(reviewerWorkbenchService.getAuditPoolMeta(taskId));
    }

    @GetMapping("/audit-pool/groups")
    public ApiResponse<PageResponse<AuditPoolGroupRow>> listAuditPoolGroups(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam String groupBy,
            @RequestParam(required = false) String reviewLevel) {
        return ok(reviewerWorkbenchService.listAuditPoolGroups(buildQuery(page, pageSize, keyword), groupBy, reviewLevel));
    }

    @GetMapping("/audit-pool")
    public ApiResponse<PageResponse<ReviewerQueueRow>> listAuditPool(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam String scopeType,
            @RequestParam String scopeIds,
            @RequestParam(required = false) String reviewLevel) {
        return ok(reviewerWorkbenchService.listAuditPool(
                buildQuery(page, pageSize, keyword), scopeType, parseScopeIds(scopeIds), reviewLevel));
    }

    @GetMapping("/audit-pool/{submissionId}")
    public ApiResponse<ReviewerSubmissionDetail> getAuditPoolDetail(@PathVariable Long submissionId) {
        return ok(reviewerWorkbenchService.getAuditPoolDetail(submissionId));
    }

    @GetMapping("/review-records/{id}")
    public ApiResponse<ReviewerReviewRecordDetail> getReviewRecordDetail(@PathVariable Long id) {
        return ok(reviewerWorkbenchService.getReviewRecordDetail(id));
    }

    @GetMapping("/review-records")
    public ApiResponse<PageResponse<ReviewerReviewRecordListRow>> listReviewRecords(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) String reviewLevel,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return ok(reviewerWorkbenchService.listReviewRecords(
                buildQuery(page, pageSize, keyword), taskId, reviewLevel, action, from, to));
    }

    @GetMapping("/submissions/{submissionId}/review-records")
    public ApiResponse<List<ReviewerReviewRecordRow>> listSubmissionReviewRecords(@PathVariable Long submissionId) {
        return ok(reviewerWorkbenchService.listSubmissionReviewRecords(submissionId));
    }

    @PostMapping("/audit-pool/{submissionId}/approve")
    public ApiResponse<ReviewerSubmissionDetail> approve(
            @PathVariable Long submissionId, @Valid @RequestBody ReviewerDecisionCommand command) {
        return ok(reviewerWorkbenchService.approve(submissionId, command));
    }

    @PostMapping("/audit-pool/{submissionId}/reject")
    public ApiResponse<ReviewerSubmissionDetail> reject(
            @PathVariable Long submissionId, @Valid @RequestBody ReviewerDecisionCommand command) {
        return ok(reviewerWorkbenchService.reject(submissionId, command));
    }

    @PostMapping("/audit-pool/{submissionId}/return")
    public ApiResponse<ReviewerSubmissionDetail> returnForRevision(
            @PathVariable Long submissionId, @Valid @RequestBody ReviewerDecisionCommand command) {
        return ok(reviewerWorkbenchService.returnForRevision(submissionId, command));
    }

    @PostMapping("/audit-pool/batch")
    public ApiResponse<ReviewerBatchSubmitResult> submitBatchDecision(
            @Valid @RequestBody ReviewerBatchDecisionCommand command) {
        return ok(reviewerWorkbenchService.submitBatchDecision(command));
    }

    @GetMapping("/batch-operations/{batchKey}")
    public ApiResponse<ReviewBatchOperationRow> getBatchOperation(@PathVariable String batchKey) {
        return ok(reviewerWorkbenchService.getBatchOperation(batchKey));
    }

    private ParsedListQuery buildQuery(int page, int pageSize, String keyword) {
        return new ParsedListQuery(page, pageSize, keyword, List.of(), List.of());
    }

    private List<Long> parseScopeIds(String scopeIds) {
        if (scopeIds == null || scopeIds.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(scopeIds.split(","))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .map(Long::parseLong)
                .distinct()
                .toList();
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
