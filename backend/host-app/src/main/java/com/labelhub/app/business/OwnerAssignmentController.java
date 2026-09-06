package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.business.AssignmentService;
import com.labelhub.core.business.SubmissionService;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner/assignments")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerAssignmentController {
    private final AssignmentService assignmentService;
    private final SubmissionService submissionService;

    public OwnerAssignmentController(AssignmentService assignmentService, SubmissionService submissionService) {
        this.assignmentService = assignmentService;
        this.submissionService = submissionService;
    }

    @GetMapping
    public ApiResponse<PageResponse<AssignmentSummary>> listAssignments(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        return ok(assignmentService.listAssignments(
                new com.labelhub.core.lowcode.query.ParsedListQuery(page, pageSize, null, List.of(), List.of())));
    }

    @GetMapping("/{id}")
    public ApiResponse<AssignmentDetail> getAssignment(@PathVariable Long id) {
        return ok(assignmentService.getAssignmentDetail(id));
    }

    @GetMapping("/{id}/submission-attempts")
    public ApiResponse<PageResponse<SubmissionAttemptSummary>> listSubmissionAttempts(
            @PathVariable Long id,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        List<SubmissionAttemptSummary> attempts = submissionService.listAttemptsByAssignment(id);
        int safePage = Math.max(page, 1);
        int safePageSize = Math.max(pageSize, 1);
        int fromIndex = (safePage - 1) * safePageSize;
        if (fromIndex >= attempts.size()) {
            return ok(PageResponse.of(attempts.size(), safePage, safePageSize, List.of()));
        }
        int toIndex = Math.min(fromIndex + safePageSize, attempts.size());
        return ok(PageResponse.of(attempts.size(), safePage, safePageSize, attempts.subList(fromIndex, toIndex)));
    }

    @PostMapping
    public ApiResponse<AssignmentSummary> createAssignment(@Valid @RequestBody AssignmentCreateCommand command) {
        return ok(assignmentService.createAssignment(command));
    }

    @RequestMapping(value = "/{id}", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ApiResponse<AssignmentSummary> updateAssignment(
            @PathVariable Long id,
            @Valid @RequestBody AssignmentUpdateCommand command) {
        return ok(assignmentService.updateAssignment(id, command));
    }

    @PostMapping("/batch")
    public ApiResponse<List<AssignmentSummary>> batchCreateAssignments(
            @Valid @RequestBody AssignmentsBatchCreateCommand command) {
        return ok(assignmentService.batchCreateAssignments(command));
    }

    @PostMapping("/batch/cancel")
    public ApiResponse<List<AssignmentSummary>> batchCancelAssignments(
            @Valid @RequestBody AssignmentsBatchCancelCommand command) {
        return ok(assignmentService.batchCancelAssignments(command));
    }

    @PostMapping("/{id}/claim")
    public ApiResponse<AssignmentSummary> claimAssignment(@PathVariable Long id) {
        return ok(assignmentService.claimAssignment(id));
    }

    @PatchMapping("/{id}/draft")
    public ApiResponse<AssignmentSummary> saveDraft(@PathVariable Long id, @RequestBody Map<String, Object> draftData) {
        return ok(assignmentService.saveDraft(id, draftData));
    }

    @PostMapping("/{id}/submit")
    public ApiResponse<AssignmentSummary> submitAssignment(@PathVariable Long id) {
        return ok(assignmentService.submitAssignment(id));
    }

    @PostMapping("/{id}/reopen")
    public ApiResponse<AssignmentSummary> reopenAssignment(@PathVariable Long id) {
        return ok(assignmentService.reopenAssignment(id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> cancelAssignment(@PathVariable Long id, @RequestParam(required = false) String reason) {
        assignmentService.cancelAssignment(id, reason != null ? reason : "");
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
