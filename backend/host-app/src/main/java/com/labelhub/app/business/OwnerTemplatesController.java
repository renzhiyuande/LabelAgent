package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.business.BusinessDtos.*;
import com.labelhub.core.business.TemplatesService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerTemplatesController {
    private final TemplatesService templatesService;

    public OwnerTemplatesController(TemplatesService templatesService) {
        this.templatesService = templatesService;
    }

    @GetMapping("/tasks/{taskId}/templates")
    public ApiResponse<PageResponse<TemplateSummary>> listTemplates(
            @PathVariable Long taskId,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        return ok(templatesService.listTemplatesByTaskId(taskId,
                new ParsedListQuery(page, pageSize, keyword, java.util.List.of(), java.util.List.of())));
    }

    @GetMapping("/templates/{id}")
    public ApiResponse<TemplateDetail> getTemplate(@PathVariable Long id) {
        return ok(templatesService.getTemplateDetail(id));
    }

    @GetMapping("/templates/{id}/versions")
    public ApiResponse<PageResponse<TemplateVersionSummary>> listTemplateVersions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize) {
        return ok(templatesService.listTemplateVersions(id,
                new ParsedListQuery(page, pageSize, null, java.util.List.of(), java.util.List.of())));
    }

    @PostMapping("/templates")
    public ApiResponse<TemplateSummary> createTemplate(@Valid @RequestBody TemplateCreateCommand command) {
        return ok(templatesService.createTemplate(command));
    }

    @PutMapping("/templates/{id}")
    public ApiResponse<TemplateSummary> updateTemplate(
            @PathVariable Long id, @Valid @RequestBody TemplateUpdateCommand command) {
        return ok(templatesService.updateTemplate(id, command));
    }

    @DeleteMapping("/templates/{id}")
    public ApiResponse<Void> deleteTemplate(@PathVariable Long id) {
        templatesService.deleteTemplate(id);
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
