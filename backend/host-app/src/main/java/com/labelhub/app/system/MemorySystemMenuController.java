package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.system.SystemDtos.DictItemSummary;
import com.labelhub.core.system.SystemDtos.MenuNode;
import com.labelhub.core.util.TraceContext;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/system")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "memory")
public class MemorySystemMenuController {
    @GetMapping("/menus")
    public ApiResponse<List<MenuNode>> currentMenus() {
        return ApiResponse.success(List.of(
                new MenuNode(
                        1L,
                        "system_users",
                        "用户管理",
                        "MENU",
                        0L,
                        "/system/users",
                        "SystemUsers",
                        "system/users",
                        "users",
                        "system:admin",
                        true,
                        false,
                        0,
                        "ACTIVE",
                        true,
                        false,
                        List.of())
        ), TraceContext.currentTraceId());
    }

    @GetMapping("/dicts/{dictCode}")
    public ApiResponse<List<DictItemSummary>> dictItems(@PathVariable String dictCode) {
        return ApiResponse.success(List.of(), TraceContext.currentTraceId());
    }
}
