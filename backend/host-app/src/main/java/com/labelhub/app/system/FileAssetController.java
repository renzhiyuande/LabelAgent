package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.system.FileAssetService;
import com.labelhub.core.system.SystemDtos.FileAssetDownload;
import com.labelhub.core.system.SystemDtos.FileAssetSummary;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.query.FilterOperator;
import com.labelhub.core.lowcode.query.ParsedFilter;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/files")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class FileAssetController {
    private final FileAssetService fileAssetService;

    public FileAssetController(FileAssetService fileAssetService) {
        this.fileAssetService = fileAssetService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin", "system:file:read" })
    public ApiResponse<PageResponse<FileAssetSummary>> listFiles(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) String mimeTypePrefix) {
        List<ParsedFilter> filters = new ArrayList<>();
        if (categoryCode != null && !categoryCode.isBlank()) {
            filters.add(new ParsedFilter("categoryCode", FilterOperator.EQ, categoryCode.trim()));
        }
        if (mimeTypePrefix != null && !mimeTypePrefix.isBlank()) {
            filters.add(new ParsedFilter("mimeTypePrefix", FilterOperator.EQ, mimeTypePrefix.trim()));
        }
        return ok(fileAssetService.listFiles(new ParsedListQuery(page, pageSize, null, filters, List.of())));
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin", "system:file:read" })
    public ApiResponse<FileAssetSummary> getFile(@PathVariable Long id) {
        return ok(fileAssetService.getFile(id));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RequireAnyPermission({ "system:admin", "system:file:upload" })
    public ApiResponse<FileAssetSummary> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "categoryCode", defaultValue = "form") String categoryCode) {
        try {
            return ok(fileAssetService.uploadFile(file.getBytes(), file.getOriginalFilename(), file.getContentType(),
                    categoryCode));
        } catch (IOException ex) {
            throw new BusinessException(ErrorCode.FILE_STORAGE_UNAVAILABLE, "读取上传文件失败");
        }
    }

    @GetMapping("/{id}/download")
    @RequireAnyPermission({ "system:admin", "system:file:read" })
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        FileAssetDownload file = fileAssetService.downloadFile(id);
        String encodedName = URLEncoder.encode(file.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + file.fileName() + "\"; filename*=UTF-8''" + encodedName)
                .contentType(MediaType.parseMediaType(file.contentType()))
                .body(file.content());
    }

    @DeleteMapping("/{id}")
    @RequireAnyPermission({ "system:admin", "system:file:delete" })
    public ApiResponse<Void> deleteFile(@PathVariable Long id) {
        fileAssetService.deleteFile(id);
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
