package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.service.AuthService;
import com.labelhub.core.system.SystemDtos.DictItemSummary;
import com.labelhub.core.system.SystemDtos.MenuNode;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.system.admin.DictAdminService;
import com.labelhub.infra.system.admin.MenuAdminService;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/system")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class SystemMenuController {
    private final MenuAdminService menuAdminService;
    private final DictAdminService dictAdminService;
    private final AuthService authService;

    public SystemMenuController(
            MenuAdminService menuAdminService,
            DictAdminService dictAdminService,
            AuthService authService) {
        this.menuAdminService = menuAdminService;
        this.dictAdminService = dictAdminService;
        this.authService = authService;
    }

    @GetMapping("/menus")
    public ApiResponse<List<MenuNode>> currentMenus() {
        AuthenticatedUser user = authService.currentUser();
        return ApiResponse.success(menuAdminService.currentUserMenus(user), TraceContext.currentTraceId());
    }

    @GetMapping("/dicts/{dictCode}")
    public ApiResponse<List<DictItemSummary>> dictItems(@PathVariable String dictCode) {
        return ApiResponse.success(dictAdminService.getActiveDictItems(dictCode), TraceContext.currentTraceId());
    }
}
