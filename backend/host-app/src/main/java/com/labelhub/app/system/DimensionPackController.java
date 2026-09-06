package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos;
import com.labelhub.core.business.BusinessDtos.DimensionPackSaveCommand;
import com.labelhub.core.business.DimensionPackService;
import com.labelhub.core.lowcode.query.ParsedListQuery;
import com.labelhub.core.system.SystemDtos.DimensionPackCommand;
import com.labelhub.core.system.SystemDtos.DimensionPackSummary;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/dimension-packs")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DimensionPackController {
    private final DimensionPackService dimensionPackService;

    public DimensionPackController(DimensionPackService dimensionPackService) {
        this.dimensionPackService = dimensionPackService;
    }

    @GetMapping
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<PageResponse<DimensionPackSummary>> listPacks(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) String keyword) {
        PageResponse<BusinessDtos.TemplateReviewDimensionPackSummary> result = dimensionPackService
                .listPacks(new ParsedListQuery(page, pageSize, keyword, List.of(), List.of()));
        return ok(PageResponse.of(result.total(), result.page(), result.pageSize(),
                result.list().stream().map(this::toSummary).toList()));
    }

    @GetMapping("/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<DimensionPackSummary> getPack(@PathVariable Long id) {
        return ok(toSummary(dimensionPackService.getPackDetail(id)));
    }

    @PostMapping
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<DimensionPackSummary> createPack(@Valid @RequestBody DimensionPackCommand command) {
        return ok(toSummary(dimensionPackService.createPack(toSaveCommand(command))));
    }

    @PutMapping("/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<DimensionPackSummary> updatePack(
            @PathVariable Long id,
            @Valid @RequestBody DimensionPackCommand command) {
        return ok(toSummary(dimensionPackService.updatePack(id, toSaveCommand(command))));
    }

    @DeleteMapping("/{id}")
    @RequireAnyPermission({ "system:admin" })
    public ApiResponse<Void> deletePack(@PathVariable Long id) {
        dimensionPackService.deletePack(id);
        return ok(null);
    }

    private DimensionPackSaveCommand toSaveCommand(DimensionPackCommand command) {
        return new DimensionPackSaveCommand(
                command.packName(),
                command.packCode(),
                command.packDesc(),
                command.sceneCode(),
                command.sortNo(),
                command.dimensions());
    }

    private DimensionPackSummary toSummary(BusinessDtos.TemplateReviewDimensionPackSummary s) {
        return new DimensionPackSummary(
                s.id(),
                s.packCode(),
                s.packName(),
                s.packDesc(),
                s.sceneCode(),
                s.isSystemPack(),
                s.sortNo(),
                s.status(),
                s.createdAt(),
                s.dimensions());
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
