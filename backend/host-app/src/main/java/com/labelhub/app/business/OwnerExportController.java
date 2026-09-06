package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.ExportJobCreateCommand;
import com.labelhub.core.business.BusinessDtos.ExportJobDownload;
import com.labelhub.core.business.BusinessDtos.ExportJobSummary;
import com.labelhub.core.business.ExportJobService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/owner/exports")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerExportController {
    private final ExportJobService exportJobService;

    public OwnerExportController(ExportJobService exportJobService) {
        this.exportJobService = exportJobService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    public ApiResponse<PageResponse<ExportJobSummary>> listExports(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) Long taskId) {
        return ok(exportJobService.listExportJobs(taskId,
                new ParsedListQuery(page, pageSize, null, List.of(), List.of())));
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    public ApiResponse<ExportJobSummary> getExport(@PathVariable Long id) {
        return ok(exportJobService.getExportJob(id));
    }

    @PostMapping
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    public ApiResponse<ExportJobSummary> createExport(@Valid @RequestBody ExportJobCreateCommand command) {
        return ok(exportJobService.createExportJob(command));
    }

    @GetMapping("/{id}/download")
    @RequireAnyPermission({ "system:admin", "business:export:manage" })
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        ExportJobDownload file = exportJobService.downloadExportJob(id);
        String encodedName = URLEncoder.encode(file.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.fileName() + "\"; filename*=UTF-8''" + encodedName)
                .contentType(MediaType.parseMediaType(file.contentType()))
                .body(file.content());
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
