package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.system.SystemDtos.MenuCommand;
import com.labelhub.core.system.SystemDtos.MenuNode;
import com.labelhub.core.system.SystemDtos.PageQuery;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import com.labelhub.infra.system.admin.MenuAdminService;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/admin/menus")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class AdminMenuController {
    private final MenuAdminService menuAdminService;

    public AdminMenuController(MenuAdminService menuAdminService) {
        this.menuAdminService = menuAdminService;
    }

    @GetMapping
    public ApiResponse<PageResponse<MenuNode>> menus(@RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
                                                     @RequestParam(defaultValue = "100") int pageSize,
                                                     @RequestParam(required = false) String keyword) {
        return ok(menuAdminService.listMenus(new PageQuery(page, pageSize, keyword)));
    }

    @GetMapping("/{id}")
    public ApiResponse<MenuNode> menu(@PathVariable Long id) {
        return ok(menuAdminService.getMenu(id));
    }

    @GetMapping("/tree")
    public ApiResponse<List<MenuNode>> menuTree() {
        return ok(menuAdminService.menuTree());
    }

    @PostMapping
    public ApiResponse<MenuNode> createMenu(@Valid @RequestBody MenuCommand command) {
        return ok(menuAdminService.createMenu(command));
    }

    @PutMapping("/{id}")
    public ApiResponse<MenuNode> updateMenu(@PathVariable Long id, @Valid @RequestBody MenuCommand command) {
        return ok(menuAdminService.updateMenu(id, command));
    }

    @PostMapping("/{id}/enable")
    public ApiResponse<Void> enableMenu(@PathVariable Long id) {
        menuAdminService.setMenuStatus(id, "ACTIVE");
        return ok(null);
    }

    @PostMapping("/{id}/disable")
    public ApiResponse<Void> disableMenu(@PathVariable Long id) {
        menuAdminService.setMenuStatus(id, "DISABLED");
        return ok(null);
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
