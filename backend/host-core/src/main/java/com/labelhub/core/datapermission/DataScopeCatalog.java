package com.labelhub.core.datapermission;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 数据权限资源类型与范围类型的唯一配置源，供策略管理 UI 与运行时谓词生成共用。
 */
public final class DataScopeCatalog {

    private DataScopeCatalog() {
    }

    public record LabeledOption(String value, String label, String description) {
    }

    private static final Map<DataResourceType, List<DataScopeType>> SUPPORTED_SCOPE_TYPES = new EnumMap<>(
            DataResourceType.class);

    private static final Map<DataResourceType, String> RESOURCE_LABELS = Map.of(
            DataResourceType.PROJECT, "项目",
            DataResourceType.TASK, "任务",
            DataResourceType.ASSIGNMENT, "标注分配",
            DataResourceType.REVIEW, "审核记录",
            DataResourceType.FILE, "素材文件");

    private static final Map<DataScopeType, String> SCOPE_LABELS = Map.of(
            DataScopeType.ALL, "全部",
            DataScopeType.CREATED_BY_ME, "仅本人创建",
            DataScopeType.PUBLIC_OR_OWN, "本人上传或公开",
            DataScopeType.ASSIGNED_TO_ME, "分配给我",
            DataScopeType.TASK_MEMBER, "任务成员",
            DataScopeType.TASK_OWNER, "任务负责人",
            DataScopeType.REVIEWER, "审核人",
            DataScopeType.CUSTOM, "自定义");

    static {
        SUPPORTED_SCOPE_TYPES.put(
                DataResourceType.TASK,
                List.of(
                        DataScopeType.ALL,
                        DataScopeType.TASK_OWNER,
                        DataScopeType.CREATED_BY_ME,
                        DataScopeType.TASK_MEMBER,
                        DataScopeType.ASSIGNED_TO_ME));
        SUPPORTED_SCOPE_TYPES.put(
                DataResourceType.ASSIGNMENT,
                List.of(
                        DataScopeType.ALL,
                        DataScopeType.ASSIGNED_TO_ME,
                        DataScopeType.TASK_OWNER,
                        DataScopeType.CREATED_BY_ME,
                        DataScopeType.TASK_MEMBER));
        SUPPORTED_SCOPE_TYPES.put(
                DataResourceType.REVIEW,
                List.of(
                        DataScopeType.ALL,
                        DataScopeType.REVIEWER,
                        DataScopeType.ASSIGNED_TO_ME,
                        DataScopeType.TASK_OWNER,
                        DataScopeType.CREATED_BY_ME,
                        DataScopeType.TASK_MEMBER));
        SUPPORTED_SCOPE_TYPES.put(
                DataResourceType.FILE,
                List.of(DataScopeType.ALL, DataScopeType.CREATED_BY_ME, DataScopeType.PUBLIC_OR_OWN));
        SUPPORTED_SCOPE_TYPES.put(DataResourceType.PROJECT, List.of());
    }

    public static List<LabeledOption> resourceTypes() {
        return SUPPORTED_SCOPE_TYPES.entrySet().stream()
                .filter(entry -> !entry.getValue().isEmpty())
                .map(entry -> toResourceOption(entry.getKey()))
                .toList();
    }

    public static List<LabeledOption> scopeTypesFor(DataResourceType resourceType) {
        return supportedScopeTypes(resourceType).stream().map(DataScopeCatalog::toScopeOption).toList();
    }

    public static List<LabeledOption> scopeTypesFor(String resourceType) {
        if (resourceType == null || resourceType.isBlank()) {
            return List.of();
        }
        try {
            return scopeTypesFor(DataResourceType.valueOf(resourceType.trim()));
        } catch (IllegalArgumentException ex) {
            return List.of();
        }
    }

    public static void ensureSupported(DataResourceType resourceType, DataScopeType scopeType) {
        if (!supportedScopeTypes(resourceType).contains(scopeType)) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "资源类型 " + resourceType.name() + " 不支持范围类型 " + scopeType.name());
        }
    }

    public static List<DataScopeType> supportedScopeTypes(DataResourceType resourceType) {
        return SUPPORTED_SCOPE_TYPES.getOrDefault(resourceType, List.of());
    }

    public static String resourceLabel(DataResourceType resourceType) {
        return RESOURCE_LABELS.getOrDefault(resourceType, resourceType.name());
    }

    public static String scopeLabel(DataScopeType scopeType) {
        return SCOPE_LABELS.getOrDefault(scopeType, scopeType.name());
    }

    private static LabeledOption toResourceOption(DataResourceType resourceType) {
        return new LabeledOption(resourceType.name(), resourceLabel(resourceType), null);
    }

    private static LabeledOption toScopeOption(DataScopeType scopeType) {
        return new LabeledOption(scopeType.name(), scopeLabel(scopeType), null);
    }
}
