package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.LowCodeDtos.BatchActionCommand;
import com.labelhub.core.lowcode.LowCodeDtos.ListQuery;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.LowCodeDtos.OptionSourceItem;
import com.labelhub.core.lowcode.LowCodeDtos.ResourceRegistryItem;
import com.labelhub.core.lowcode.LowCodeDtos.FilterRule;
import com.labelhub.core.system.SystemDtos.AsyncTaskSummary;
import com.labelhub.core.system.SystemDtos.AuditLogSummary;
import com.labelhub.core.system.SystemDtos.DictItemSummary;
import com.labelhub.core.system.SystemDtos.DictTypeSummary;
import com.labelhub.core.system.SystemDtos.MenuNode;
import com.labelhub.core.system.SystemDtos.PermissionSummary;
import com.labelhub.core.system.SystemDtos.SystemClientSummary;
import com.labelhub.core.system.SystemDtos.DataScopePolicySummary;
import com.labelhub.core.util.TraceContext;
import java.time.Instant;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "memory")
public class MemoryLowCodeController {
    @GetMapping("/api/v1/engine/options")
    public ApiResponse<List<OptionSourceItem>> optionSources() {
        return ok(List.of(
                new OptionSourceItem("roles", "角色"),
                new OptionSourceItem("menus", "菜单"),
                new OptionSourceItem("users", "用户"),
                new OptionSourceItem("dictTypes", "字典类型"),
                new OptionSourceItem("systemClients", "系统客户端"),
                new OptionSourceItem("distributeStrategies", "任务分发策略")
        ));
    }

    @GetMapping("/api/v1/engine/options/roles")
    public ApiResponse<List<OptionItem>> roleOptions() {
        return ok(List.of(new OptionItem("Administrator", 1L)));
    }

    @GetMapping("/api/v1/engine/options/menus")
    public ApiResponse<List<OptionItem>> menuOptions() {
        return ok(List.of(new OptionItem("System", 1L)));
    }

    @GetMapping("/api/v1/engine/options/users")
    public ApiResponse<List<OptionItem>> userOptions() {
        return ok(List.of(new OptionItem("Administrator", 1L)));
    }

    @GetMapping("/api/v1/engine/options/dictTypes")
    public ApiResponse<List<OptionItem>> dictTypeOptions() {
        return ok(List.of(new OptionItem("任务状态", 1L)));
    }

    @GetMapping("/api/v1/engine/options/systemClients")
    public ApiResponse<List<OptionItem>> systemClientOptions() {
        return ok(List.of(new OptionItem("System Agent", 1L)));
    }

    @GetMapping("/api/v1/engine/options/distributeStrategies")
    public ApiResponse<List<OptionItem>> distributeStrategyOptions(@RequestParam(required = false) String keyword) {
        List<OptionItem> options = List.of(
                new OptionItem("先到先得", "FIRST_COME"),
                new OptionItem("配额抢单", "QUOTA"),
                new OptionItem("指派模式", "ASSIGN")
        );
        if (keyword == null || keyword.isBlank()) {
            return ok(options);
        }
        String lower = keyword.trim().toLowerCase();
        return ok(options.stream()
                .filter(option -> String.valueOf(option.value()).toLowerCase().contains(lower)
                        || option.label().toLowerCase().contains(lower))
                .toList());
    }

    @GetMapping("/api/v1/engine/resources")
    public ApiResponse<List<ResourceRegistryItem>> resources() {
        return ok(List.of(
                new ResourceRegistryItem("users", "用户", Map.class, List.of("enable", "disable")),
                new ResourceRegistryItem("roles", "角色", Map.class, List.of("enable", "disable")),
                new ResourceRegistryItem("permissions", "权限", PermissionSummary.class, List.of("enable", "disable")),
                new ResourceRegistryItem("menus", "菜单", MenuNode.class, List.of("enable", "disable")),
                new ResourceRegistryItem("dictTypes", "字典类型", DictTypeSummary.class, List.of("enable", "disable", "delete")),
                new ResourceRegistryItem("dictItems", "字典项", DictItemSummary.class, List.of("enable", "disable", "delete")),
                new ResourceRegistryItem("dataScopes", "数据范围", DataScopePolicySummary.class, List.of("enable", "disable")),
                new ResourceRegistryItem("systemClients", "系统客户端", SystemClientSummary.class, List.of("enable", "disable")),
                new ResourceRegistryItem("auditLogs", "审计日志", AuditLogSummary.class, List.of()),
                new ResourceRegistryItem("asyncTasks", "异步任务", AsyncTaskSummary.class, List.of()),
                new ResourceRegistryItem("llmProviders", "LLM提供商", Map.class, List.of("enable", "disable", "delete")),
                new ResourceRegistryItem("dimensionPacks", "维度包", Map.class, List.of("enable", "disable", "delete")),
                new ResourceRegistryItem("templateMarket", "模板市场", Map.class, List.of()),
                new ResourceRegistryItem("templateMarketAdmin", "模板市场管理", Map.class, List.of())
        ));
    }

    @PostMapping("/api/v1/engine/resources/{resource}/query")
    public ApiResponse<?> query(@PathVariable String resource, @Valid @RequestBody ListQuery query) {
        return switch (resource) {
            case "users" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    Map.of(
                            "id", 1L,
                            "username", "admin",
                            "displayName", "Administrator",
                            "email", "admin@labelhub.local",
                            "phone", "13800000000",
                            "status", "ACTIVE",
                            "roles", List.of("Administrator")
                    )
            )));
            case "roles" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    Map.of(
                            "id", 1L,
                            "roleCode", "ADMIN",
                            "roleName", "Administrator",
                            "status", "ACTIVE",
                            "remark", "memory mode mock role",
                            "permissions", List.of("system:admin")
                    )
            )));
            case "permissions" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    new PermissionSummary(1L, "system:admin", "System Administration", "SYSTEM", "/api/v1/admin/**", "ACTIVE")
            )));
            case "menus" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    new MenuNode(1L, "system.root", "System", "MENU", 0L, "/system", "system",
                            "pages/system", "settings", "system:menu:read", true, false, 1, "ACTIVE", false, false, List.of())
            )));
            case "dictTypes" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    new DictTypeSummary(1L, "TASK_STATUS", "任务状态", "ACTIVE", "memory mode mock dict type")
            )));
            case "dictItems" -> {
                requireLongFilter(query, "dictTypeId");
                yield ok(PageResponse.of(2, query.normalizedPage(), query.normalizedPageSize(), List.of(
                        new DictItemSummary(1L, 1L, "PENDING", "待处理", "PENDING", 10, true, "ACTIVE", null, null),
                        new DictItemSummary(2L, 1L, "DONE", "已完成", "DONE", 20, false, "ACTIVE", null, null)
                )));
            }
            case "dataScopes" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    new DataScopePolicySummary(1L, "task.all", "All Tasks",
                            com.labelhub.core.datapermission.DataResourceType.TASK,
                            com.labelhub.core.datapermission.DataScopeType.ALL,
                            null, "ACTIVE", "memory mode")
            )));
            case "systemClients" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    new SystemClientSummary(1L, "system-agent", "System Agent", "AGENT", List.of("internal:health"),
                            "ACTIVE", null, null, "UNKNOWN", null, null, "memory mode", null)
            )));
            case "auditLogs" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    new AuditLogSummary(1L, "USER", 1L, "user.create", "USER", 1L, "Administrator",
                            "seed-trace-1", "127.0.0.1", "memory mode log", Instant.now())
            )));
            case "asyncTasks" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    new AsyncTaskSummary(1L, "EXPORT", "TASK", 1L, "task-export-1", 5,
                            "FAILED", 0, 3, 0, Instant.now(), null, null, null)
            )));
            case "llmProviders" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    Map.of(
                            "id", 1L,
                            "providerCode", "openai",
                            "providerName", "OpenAI",
                            "baseUrl", "https://api.openai.com/v1",
                            "status", "ACTIVE",
                            "isSystemProvider", 0,
                            "configJson", Map.of("timeout", 30000, "maxRetries", 3),
                            "createdAt", Instant.now()
                    )
            )));
            case "dimensionPacks" -> ok(PageResponse.of(1, query.normalizedPage(), query.normalizedPageSize(), List.of(
                    Map.of(
                            "id", 1L,
                            "packCode", "quality-review",
                            "packName", "质量审核维度包",
                            "packDesc", "用于质量审核的标准维度",
                            "sceneCode", "REVIEW",
                            "status", "ACTIVE",
                            "isSystemPack", 1,
                            "sortNo", 1,
                            "createdAt", Instant.now()
                    )
            )));
            default -> throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Low-code resource not found: " + resource);
        };
    }

    @GetMapping("/api/v1/engine/resources/{resource}/{id}")
    public ApiResponse<?> detail(@PathVariable String resource, @PathVariable Long id) {
        return switch (resource) {
            case "users" -> ok(Map.of(
                    "id", id,
                    "username", "admin",
                    "displayName", "Administrator",
                    "email", "admin@labelhub.local",
                    "phone", "13800000000",
                    "status", "ACTIVE",
                    "roles", List.of("Administrator")
            ));
            default -> throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Low-code resource not found: " + resource);
        };
    }

    @PostMapping("/api/v1/engine/resources/{resource}")
    public ApiResponse<Map<String, Object>> create(@PathVariable String resource,
                                                    @RequestBody Map<String, Object> body) {
        body.put("id", System.currentTimeMillis());
        return ok(body);
    }

    @PutMapping("/api/v1/engine/resources/{resource}/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable String resource,
                                                    @PathVariable Long id,
                                                    @RequestBody Map<String, Object> body) {
        body.put("id", id);
        return ok(body);
    }

    @PostMapping("/api/v1/engine/resources/{resource}/actions/{action}/batch")
    public ApiResponse<Void> runBatchAction(@PathVariable String resource,
                                            @PathVariable String action,
                                            @Valid @RequestBody BatchActionCommand command) {
        List<String> supportedActions = switch (resource) {
            case "users", "roles", "permissions", "menus", "dataScopes", "systemClients" -> List.of("enable", "disable");
            case "dictTypes", "dictItems", "llmProviders", "dimensionPacks", "taskItems" -> List.of("enable", "disable", "delete");
            default -> List.of();
        };
        if (!supportedActions.contains(action)) {
            throw new BusinessException(ErrorCode.ENG_UNSUPPORTED_BULK_ACTION);
        }
        if ("taskItems".equals(resource) && "delete".equals(action)) {
            throw new BusinessException(ErrorCode.ASGN_TASK_ITEM_NOT_FOUND);
        }
        return ok(null);
    }

    @PostMapping("/api/v1/engine/resources/{resource}/{id}/actions/{action}")
    public ApiResponse<Void> runAction(@PathVariable String resource,
                                       @PathVariable Long id,
                                       @PathVariable String action) {
        List<String> supportedActions = switch (resource) {
            case "users", "roles", "permissions", "menus", "dataScopes", "systemClients" -> List.of("enable", "disable");
            case "dictTypes", "dictItems", "llmProviders", "dimensionPacks" -> List.of("enable", "disable", "delete");
            case "auditLogs", "asyncTasks", "templateMarket", "templateMarketAdmin" -> List.of();
            default -> throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Low-code resource not found: " + resource);
        };
        if (!supportedActions.contains(action)) {
            throw new BusinessException(ErrorCode.ENG_UNSUPPORTED_ACTION);
        }
        return ok(null);
    }

    private Long requireLongFilter(ListQuery query, String fieldName) {
        if (query.filters() == null) {
            throw new BusinessException(ErrorCode.ENG_FILTER_REQUIRED);
        }
        return query.filters().stream()
                .filter(filter -> fieldName.equals(filter.field()))
                .map(FilterRule::value)
                .map(value -> value instanceof Number number ? number.longValue() : null)
                .filter(value -> value != null)
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.ENG_FILTER_REQUIRED));
    }

    @GetMapping("/api/v1/admin/dict-types/{id}")
    public ApiResponse<DictTypeSummary> dictType(@PathVariable Long id) {
        return ok(new DictTypeSummary(id, "TASK_STATUS", "任务状态", "ACTIVE", "memory mode mock dict type"));
    }

    @GetMapping("/api/v1/admin/dict-items/{id}")
    public ApiResponse<DictItemSummary> dictItem(@PathVariable Long id) {
        return ok(new DictItemSummary(id, 1L, "PENDING", "待处理", "PENDING", 10, true, "ACTIVE", null, null));
    }

    @DeleteMapping("/api/v1/admin/dict-types/{id}")
    public ApiResponse<Void> deleteDictType(@PathVariable Long id) {
        return ok(null);
    }

    @DeleteMapping("/api/v1/admin/dict-items/{id}")
    public ApiResponse<Void> deleteDictItem(@PathVariable Long id) {
        return ok(null);
    }

//    @PostMapping("/api/v1/engine/resources/{resource}/{id}/actions/{action}")
//    public ApiResponse<Void> runAction(@PathVariable String resource,
//                                       @PathVariable Long id,
//                                       @PathVariable String action) {
//        return ok(null);
//    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
