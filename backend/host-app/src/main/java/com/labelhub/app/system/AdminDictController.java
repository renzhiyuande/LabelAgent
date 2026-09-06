package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.system.SystemDtos.DictItemCommand;
import com.labelhub.core.system.SystemDtos.DictItemSummary;
import com.labelhub.core.system.SystemDtos.DictTypeCommand;
import com.labelhub.core.system.SystemDtos.DictTypeSummary;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.system.admin.DictAdminService;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminDictController {
    private final DictAdminService dictAdminService;

    public AdminDictController(DictAdminService dictAdminService) {
        this.dictAdminService = dictAdminService;
    }

    @GetMapping("/dict-types")
    public ApiResponse<PageResponse<DictTypeSummary>> dictTypes(@RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                                @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_ADMIN_PAGE_SIZE) int pageSize,
                                                                @RequestParam(required = false) String keyword) {
        return ok(dictAdminService.listDictTypes(new PageQuery(page, pageSize, keyword)));
    }

    @GetMapping("/dict-types/{id}")
    public ApiResponse<DictTypeSummary> dictType(@PathVariable Long id) {
        return ok(dictAdminService.getDictType(id));
    }

    @PostMapping("/dict-types")
    public ApiResponse<DictTypeSummary> createDictType(@Valid @RequestBody DictTypeCommand command) {
        return ok(dictAdminService.createDictType(command));
    }

    @PutMapping("/dict-types/{id}")
    public ApiResponse<DictTypeSummary> updateDictType(@PathVariable Long id, @Valid @RequestBody DictTypeCommand command) {
        return ok(dictAdminService.updateDictType(id, command));
    }

    @DeleteMapping("/dict-types/{id}")
    public ApiResponse<Void> deleteDictType(@PathVariable Long id) {
        dictAdminService.deleteDictType(id);
        return ok(null);
    }

    @PostMapping("/dict-types/{id}/enable")
    public ApiResponse<Void> enableDictType(@PathVariable Long id) {
        dictAdminService.setDictTypeStatus(id, "ACTIVE");
        return ok(null);
    }

    @PostMapping("/dict-types/{id}/disable")
    public ApiResponse<Void> disableDictType(@PathVariable Long id) {
        dictAdminService.setDictTypeStatus(id, "DISABLED");
        return ok(null);
    }

    @GetMapping("/dict-types/{dictTypeId}/items")
    public ApiResponse<PageResponse<DictItemSummary>> dictItems(@PathVariable Long dictTypeId,
                                                                @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                                @RequestParam(defaultValue = "50") int pageSize,
                                                                @RequestParam(required = false) String keyword) {
        return ok(dictAdminService.listDictItems(dictTypeId, new PageQuery(page, pageSize, keyword)));
    }

    @GetMapping("/dict-items/{id}")
    public ApiResponse<DictItemSummary> dictItem(@PathVariable Long id) {
        return ok(dictAdminService.getDictItem(id));
    }

    @PostMapping("/dict-items")
    public ApiResponse<DictItemSummary> createDictItem(@Valid @RequestBody DictItemCommand command) {
        return ok(dictAdminService.createDictItem(command));
    }

    @PutMapping("/dict-items/{id}")
    public ApiResponse<DictItemSummary> updateDictItem(@PathVariable Long id, @Valid @RequestBody DictItemCommand command) {
        return ok(dictAdminService.updateDictItem(id, command));
    }

    @DeleteMapping("/dict-items/{id}")
    public ApiResponse<Void> deleteDictItem(@PathVariable Long id) {
        dictAdminService.deleteDictItem(id);
        return ok(null);
    }

    @PostMapping("/dict-items/{id}/enable")
    public ApiResponse<Void> enableDictItem(@PathVariable Long id) {
        dictAdminService.setDictItemStatus(id, "ACTIVE");
        return ok(null);
    }

    @PostMapping("/dict-items/{id}/disable")
    public ApiResponse<Void> disableDictItem(@PathVariable Long id) {
        dictAdminService.setDictItemStatus(id, "DISABLED");
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
