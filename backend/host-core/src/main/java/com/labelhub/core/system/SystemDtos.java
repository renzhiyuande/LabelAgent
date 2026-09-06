package com.labelhub.core.system;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScopeType;
import com.labelhub.core.jackson.FlexibleJsonMapDeserializer;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class SystemDtos {
    private SystemDtos() {
    }

    public record PageQuery(
            @Min(1) @Max(9999) int page,
            @Min(1) @Max(100) int pageSize,
            @Size(max = 255) String keyword) {
        public int normalizedPage() {
            return page <= 0 ? 1 : page;
        }

        public int normalizedPageSize() {
            if (pageSize <= 0) {
                return 10;
            }
            return Math.min(pageSize, 100);
        }
    }

    public record UserSummary(Long id, String username, String displayName, String email, String phone,
                              String status, Instant lastLoginAt, List<RoleSummary> roles) {
    }

    public record UserCommand(
            @NotBlank @Size(min = 3, max = 64) String username,
            @NotBlank @Size(min = 1, max = 64) String displayName,
            @Size(min = 8, max = 128) String password,
            @Email @Size(max = 128) String email,
            @Pattern(regexp = "^1\\d{10}$", message = "手机号格式错误") String phone,
            List<@Min(1) Long> roleIds) {
    }

    public record AssignRolesCommand(
            @NotEmpty List<@Min(1) Long> roleIds) {
    }

    public record BatchAssignRolesCommand(
            @NotEmpty List<@Min(1) Long> userIds,
            @NotEmpty List<@Min(1) Long> roleIds) {
    }

    public record BatchAssignRolesFailure(Long userId, String message) {
    }

    public record BatchAssignRolesResult(
            int successCount,
            int failureCount,
            List<BatchAssignRolesFailure> failures) {
    }

    public record RoleSummary(Long id, String roleCode, String roleName, String status, String remark,
                              Set<String> permissions) {
    }

    public record RoleCommand(
            @NotBlank @Size(max = 64) String roleCode,
            @NotBlank @Size(max = 64) String roleName,
            @Size(max = 255) String remark) {
    }

    public record AssignPermissionsCommand(
            @NotEmpty List<@Min(1) Long> permissionIds) {
    }

    public record AssignMenusCommand(
            @NotEmpty List<@Min(1) Long> menuIds) {
    }

    public record RolePermissionAssignment(Long id, String permissionCode, String permissionName) {
    }

    public record RoleMenuAssignment(Long id, String menuCode, String menuName, String path) {
    }

    public record PermissionSummary(Long id, String permissionCode, String permissionName, String moduleCode,
                                    String apiPattern, String status) {
    }

    public record PermissionCommand(
            @NotBlank @Size(max = 128) String permissionCode,
            @NotBlank @Size(max = 128) String permissionName,
            @NotBlank @Size(max = 64) String moduleCode,
            @Size(max = 255) String apiPattern) {
    }

    public record MenuNode(Long id, String menuCode, String menuName, String menuType, Long parentId, String path,
                           String routeName, String componentPath, String icon, String permissionCode,
                           boolean visible, boolean disabled, int sortNo, String status, boolean keepAlive,
                           boolean affix, List<MenuNode> children) {
    }

    public record MenuCommand(
            @NotBlank @Size(max = 64) String menuCode,
            @NotBlank @Size(max = 64) String menuName,
            @NotBlank @Pattern(regexp = "^(MENU|BUTTON|CATALOG)$", message = "菜单类型必须是 MENU/BUTTON/CATALOG") String menuType,
            Long parentId,
            @Pattern(regexp = "^/[a-zA-Z0-9/_-]*$", message = "路由路径格式错误") @Size(max = 128) String path,
            @Size(max = 128) String routeName,
            @Pattern(regexp = "^[a-zA-Z0-9/_-]*$", message = "组件路径格式错误") @Size(max = 255) String componentPath,
            @Size(max = 128) String icon,
            @Size(max = 128) String permissionCode,
            Boolean visible,
            Boolean disabled,
            @Min(0) @Max(9999) Integer sortNo) {
    }

    public record SystemClientSummary(Long id, String clientCode, String clientName, String clientType,
                                      List<String> allowedScopes, String status, Instant lastUsedAt,
                                      Instant expiresAt, String onlineStatus, Instant lastProbeAt,
                                      Long probeLatencyMs, String probeMessage, String agentBaseUrl) {
    }

    public record SystemClientCommand(
            @NotBlank @Size(max = 64) String clientCode,
            @NotBlank @Size(max = 128) String clientName,
            @NotBlank @Pattern(regexp = "^(WEB|APP|SERVICE)$", message = "客户端类型必须是 WEB/APP/SERVICE") String clientType,
            List<String> allowedScopes,
            Instant expiresAt) {
    }

    public record RotatedSecret(String clientCode, String secret) {
    }

    public record DictTypeSummary(Long id, String dictCode, String dictName, String status, String remark) {
    }

    public record DictTypeCommand(
            @NotBlank @Size(max = 64) String dictCode,
            @NotBlank @Size(max = 128) String dictName,
            @Size(max = 255) String remark) {
    }

    public record DictItemSummary(Long id, Long dictTypeId, String itemCode, String itemLabel, String itemValue,
                                  int sortNo, boolean isDefault, String status, String className, String tone) {
    }

    public record DictItemCommand(
            @NotNull @Min(1) Long dictTypeId,
            @NotBlank @Size(max = 64) String itemCode,
            @NotBlank @Size(max = 128) String itemLabel,
            @NotBlank @Size(max = 255) String itemValue,
            @Min(0) @Max(9999) Integer sortNo,
            Boolean isDefault,
            @Size(max = 128) String className,
            @Size(max = 32) String tone) {
    }

    public record DataScopePolicySummary(Long id, String policyCode, String policyName, DataResourceType resourceType,
                                         DataScopeType scopeType, String scopeValueJson, String status, String remark) {
    }

    public record DataScopePolicyCommand(
            @NotBlank @Size(max = 64) String policyCode,
            @NotBlank @Size(max = 128) String policyName,
            @NotNull DataResourceType resourceType,
            @NotNull DataScopeType scopeType,
            @Size(max = 2048) String scopeValueJson,
            @Size(max = 255) String remark) {
    }

    public record AssignDataScopesCommand(
            @NotEmpty List<@Min(1) Long> policyIds) {
    }

    public record RoleDataScopeSummary(Long roleId, String roleCode, List<DataScopePolicySummary> policies) {
    }

    public record AuditLogSummary(Long id, String entityType, Long entityId, String actionCode, String operatorType,
                                  Long operatorId, String operatorName, String traceId, String sourceIp,
                                  String remark, Instant occurredAt) {
    }

    public record AsyncTaskSummary(Long id, String taskType, String bizType, Long bizId, String bizKey, int priority,
                                   String status, int retryCount, int maxRetryCount, int manualRetryCount,
                                   Instant nextRunAt, String workerId, String lastErrorCode,
                                   String lastErrorMessage) {
    }

    public record AsyncTaskDetail(AsyncTaskSummary summary, Map<String, Object> payload) {
    }

    public record AdminOverview(PageResponse<UserSummary> users, PageResponse<RoleSummary> roles) {
    }

    public record DimensionPackSummary(
            Long id,
            String packCode,
            String packName,
            String packDesc,
            String sceneCode,
            Integer isSystemPack,
            Integer sortNo,
            String status,
            Instant createdAt,
            List<Map<String, Object>> dimensions) {
    }

    public record DimensionPackCommand(
            @NotBlank @Size(max = 128) String packName,
            @NotBlank @Size(max = 64) String packCode,
            @Size(max = 512) String packDesc,
            @NotBlank @Size(max = 64) String sceneCode,
            Integer sortNo,
            List<Map<String, Object>> dimensions) {
    }

    public record LlmProviderSummary(
            Long id,
            String providerCode,
            String providerName,
            String baseUrl,
            String status,
            Integer isSystemProvider,
            Instant createdAt) {
    }

    public record LlmProviderCommand(
            @NotBlank @Size(max = 128) String providerName,
            @NotBlank @Size(max = 64) String providerCode,
            String baseUrl,
            String apiKey,
            @JsonDeserialize(using = FlexibleJsonMapDeserializer.class)
            Map<String, Object> configJson) {
    }

    public record LlmDiscoverModelsCommand(
            @NotBlank @Size(max = 512) String baseUrl,
            @NotBlank @Size(max = 512) String apiKey,
            @Size(max = 64) String providerCode) {
    }

    public record LlmModelCommand(
            @NotNull @Min(1) Long providerId,
            @NotBlank @Size(max = 64) String modelCode,
            @NotBlank @Size(max = 128) String modelName,
            @NotBlank @Size(max = 32) String modelType,
            Integer contextWindow,
            Integer maxOutputTokens,
            java.math.BigDecimal costPer1kInputTokens,
            java.math.BigDecimal costPer1kOutputTokens,
            @NotBlank @Size(max = 32) String status) {
    }

    public record ScheduledTaskSummary(Long id, String taskName, String taskType, String cronExpr,
                                        int enabled, int priority, Instant lastTriggeredAt,
                                        Instant nextTriggerAt, int totalTriggerCount, String description) {
    }

    public record ScheduledTaskDetail(ScheduledTaskSummary summary, Map<String, Object> payload) {
    }

    public record ScheduledTaskCreateCommand(
            @NotBlank @Size(max = 128) String taskName,
            @NotBlank @Size(max = 32) String taskType,
            @NotBlank @Size(max = 64) String cronExpr,
            String payloadJson,
            @Size(max = 32) String bizType,
            Long bizId,
            @Min(0) @Max(9) Integer priority,
            @Min(0) @Max(10) Integer maxRetryCount,
            Boolean enabled,
            @Size(max = 512) String description) {
    }

    public record ScheduledTaskUpdateCommand(
            @Size(max = 128) String taskName,
            @Size(max = 32) String taskType,
            @Size(max = 64) String cronExpr,
            String payloadJson,
            @Size(max = 32) String bizType,
            Long bizId,
            @Min(0) @Max(9) Integer priority,
            @Min(0) @Max(10) Integer maxRetryCount,
            Boolean enabled,
            @Size(max = 512) String description) {
    }

    public record FileAssetSummary(
            Long id,
            String originalName,
            String mimeType,
            Long sizeBytes,
            String categoryCode,
            Boolean isPublic,
            Long uploadedBy,
            Instant uploadedAt,
            String downloadUrl) {
    }

    public record FileAssetDownload(
            String fileName,
            String contentType,
            byte[] content) {
    }
}
