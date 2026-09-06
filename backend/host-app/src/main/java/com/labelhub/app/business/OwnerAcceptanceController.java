package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.AcceptanceService;
import com.labelhub.core.business.BusinessDtos.AcceptanceCreateCommand;
import com.labelhub.core.business.BusinessDtos.AcceptanceSampleDecisionCommand;
import com.labelhub.core.business.BusinessDtos.AcceptanceSampleRow;
import com.labelhub.core.business.BusinessDtos.AcceptanceSummary;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner/acceptances")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerAcceptanceController {
    private final AcceptanceService acceptanceService;

    public OwnerAcceptanceController(AcceptanceService acceptanceService) {
        this.acceptanceService = acceptanceService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public ApiResponse<PageResponse<AcceptanceSummary>> listAcceptances(
            @RequestParam(required = false) Long taskId,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        return ok(acceptanceService.listAcceptances(taskId,
                new ParsedListQuery(page, pageSize, null, List.of(), List.of())));
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public ApiResponse<AcceptanceSummary> getAcceptance(@PathVariable Long id) {
        return ok(acceptanceService.getAcceptance(id));
    }

    @PostMapping
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public ApiResponse<AcceptanceSummary> createAcceptance(@Valid @RequestBody AcceptanceCreateCommand command) {
        return ok(acceptanceService.createAcceptance(command));
    }

    @PostMapping("/{id}/samples")
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public ApiResponse<AcceptanceSummary> generateSamples(@PathVariable Long id) {
        return ok(acceptanceService.generateSamples(id));
    }

    @GetMapping("/{id}/samples")
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public ApiResponse<PageResponse<AcceptanceSampleRow>> listSamples(
            @PathVariable Long id,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "50") int pageSize) {
        return ok(acceptanceService.listSamples(id,
                new ParsedListQuery(page, pageSize, null, List.of(), List.of())));
    }

    @GetMapping("/{id}/samples/{sampleId}")
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public ApiResponse<AcceptanceSampleRow> getSample(
            @PathVariable Long id,
            @PathVariable Long sampleId) {
        return ok(acceptanceService.getSample(id, sampleId));
    }

    @PostMapping("/samples/{sampleId}/decision")
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public ApiResponse<AcceptanceSummary> decideSample(
            @PathVariable Long sampleId,
            @Valid @RequestBody AcceptanceSampleDecisionCommand command) {
        return ok(acceptanceService.decideSample(sampleId, command.decision(), command.comment()));
    }

    @PostMapping("/{id}/confirm")
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public ApiResponse<AcceptanceSummary> confirmAcceptance(
            @PathVariable Long id,
            @RequestParam(required = false) String comment) {
        return ok(acceptanceService.confirmAcceptance(id, comment));
    }

    @PostMapping("/{id}/reopen")
    @RequireAnyPermission({ "system:admin", "business:acceptance:manage" })
    public ApiResponse<AcceptanceSummary> reopenAcceptance(@PathVariable Long id) {
        return ok(acceptanceService.reopenAcceptance(id));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
