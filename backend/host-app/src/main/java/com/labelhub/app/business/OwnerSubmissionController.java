package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.SubmissionDetail;
import com.labelhub.core.business.BusinessDtos.SubmissionDraftSaveCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionSubmitCommand;
import com.labelhub.core.business.BusinessDtos.SubmissionSummary;
import com.labelhub.core.business.SubmissionService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
@RequestMapping("/api/v1/owner/submissions")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerSubmissionController {
    private final SubmissionService submissionService;

    public OwnerSubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @GetMapping
    public ApiResponse<PageResponse<SubmissionSummary>> listSubmissions(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        return ok(submissionService.listSubmissions(new ParsedListQuery(page, pageSize, null, List.of(), List.of())));
    }

    @GetMapping("/{id}")
    public ApiResponse<SubmissionDetail> getSubmission(@PathVariable Long id) {
        return ok(submissionService.getSubmissionDetail(id));
    }

    @PostMapping("/draft")
    public ApiResponse<SubmissionSummary> createDraft(@RequestBody Map<String, Object> body) {
        Object value = body.get("assignmentId");
        Long assignmentId = value instanceof Number number ? number.longValue() : null;
        if (assignmentId == null || assignmentId < 1) {
            throw new com.labelhub.core.error.BusinessException(
                    com.labelhub.core.error.ErrorCode.VALIDATION_ERROR, "assignmentId is required");
        }
        return ok(submissionService.createDraft(assignmentId));
    }

    @PutMapping("/{id}/draft")
    public ApiResponse<SubmissionSummary> saveDraft(
            @PathVariable Long id, @Valid @RequestBody SubmissionDraftSaveCommand command) {
        return ok(submissionService.saveDraft(id, command));
    }

    @PostMapping("/{id}/submit")
    public ApiResponse<SubmissionSummary> submit(
            @PathVariable Long id, @RequestBody(required = false) SubmissionSubmitCommand command) {
        SubmissionSubmitCommand payload = command == null
                ? new SubmissionSubmitCommand(Map.of(), null)
                : command;
        return ok(submissionService.submit(id, payload));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
