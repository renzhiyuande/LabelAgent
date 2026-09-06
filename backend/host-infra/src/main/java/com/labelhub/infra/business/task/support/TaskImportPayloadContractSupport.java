package com.labelhub.infra.business.task.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.business.BusinessDtos.ImportColumnBinding;
import com.labelhub.core.business.BusinessDtos.TaskImportPayloadContract;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * 任务导入数据契约：requiredKeys（display）必填，optionalKeys（input）可选；
 * 每行 rowKeys 须满足 required ⊆ rowKeys ⊆ allowed。
 */
public final class TaskImportPayloadContractSupport {

    private static final String SOURCE_FIRST_IMPORT = "FIRST_IMPORT";
    private static final String SOURCE_FROM_TEMPLATE = "FROM_TEMPLATE";

    private TaskImportPayloadContractSupport() {
    }

    public static TaskImportPayloadContract parseContract(ObjectMapper objectMapper, String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> root = objectMapper.readValue(json, new TypeReference<>() {
            });
            List<String> requiredKeys = readStringList(root.get("requiredKeys"));
            List<String> optionalKeys = readStringList(root.get("optionalKeys"));
            List<String> forbiddenKeys = readStringList(root.get("forbiddenKeys"));
            if (requiredKeys.isEmpty() && optionalKeys.isEmpty()) {
                return null;
            }
            Integer schemaVersion = root.get("schemaVersion") instanceof Number n ? n.intValue() : 1;
            String source = root.get("source") instanceof String s ? s : null;
            String lockedAt = root.get("lockedAt") instanceof String s ? s : null;
            return new TaskImportPayloadContract(schemaVersion, requiredKeys, optionalKeys, forbiddenKeys, lockedAt,
                    source);
        } catch (Exception e) {
            return null;
        }
    }

    public static String serializeContract(ObjectMapper objectMapper, TaskImportPayloadContract contract) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "schemaVersion", contract.schemaVersion() == null ? 1 : contract.schemaVersion(),
                    "requiredKeys", contract.requiredKeys(),
                    "optionalKeys", contract.optionalKeys(),
                    "forbiddenKeys", contract.forbiddenKeys() == null ? List.of() : contract.forbiddenKeys(),
                    "lockedAt", contract.lockedAt() == null ? Instant.now().toString() : contract.lockedAt(),
                    "source", contract.source() == null ? SOURCE_FIRST_IMPORT : contract.source()));
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Failed to serialize import contract");
        }
    }

    public static TaskImportPayloadContract buildFromColumnBindings(List<ImportColumnBinding> bindings) {
        if (bindings == null || bindings.isEmpty()) {
            return null;
        }
        List<String> required = new ArrayList<>();
        List<String> optional = new ArrayList<>();
        for (ImportColumnBinding binding : bindings) {
            if (binding == null || binding.key() == null || binding.key().isBlank()) {
                continue;
            }
            String key = binding.key().trim();
            String role = binding.role() == null ? "" : binding.role().trim().toLowerCase();
            switch (role) {
                case "display" -> required.add(key);
                case "input" -> optional.add(key);
                default -> {
                    // ignore
                }
            }
        }
        if (required.isEmpty() && optional.isEmpty()) {
            return null;
        }
        return new TaskImportPayloadContract(1, distinctSorted(required), distinctSorted(optional), List.of(),
                Instant.now().toString(), SOURCE_FIRST_IMPORT);
    }

    /**
     * 无契约时从模板 schema 推断：readonly → required，其余非 runtime binding → optional。
     */
    public static TaskImportPayloadContract inferFromFormSchemaJson(ObjectMapper objectMapper, String schemaJson) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> root = objectMapper.readValue(schemaJson, new TypeReference<>() {
            });
            Object sectionsObj = root.get("sections");
            if (!(sectionsObj instanceof List<?> sections)) {
                return null;
            }
            Set<String> required = new TreeSet<>();
            Set<String> optional = new TreeSet<>();
            Set<String> runtime = new TreeSet<>();
            for (Object sectionObj : sections) {
                if (sectionObj instanceof Map<?, ?> section) {
                    Object fieldsObj = section.get("fields");
                    if (fieldsObj instanceof List<?> fields) {
                        collectContractKeysFromFields(fields, required, optional, runtime);
                    }
                }
            }
            if (required.isEmpty() && optional.isEmpty()) {
                return null;
            }
            return new TaskImportPayloadContract(1, new ArrayList<>(required), new ArrayList<>(optional), List.of(),
                    null, SOURCE_FROM_TEMPLATE);
        } catch (Exception e) {
            return null;
        }
    }

    public static void assertRowsMatchContract(List<Map<String, Object>> items, TaskImportPayloadContract contract) {
        if (contract == null || items == null || items.isEmpty()) {
            return;
        }
        Set<String> required = new LinkedHashSet<>(contract.requiredKeys());
        Set<String> allowed = new LinkedHashSet<>(contract.requiredKeys());
        allowed.addAll(contract.optionalKeys());
        Set<String> forbidden = contract.forbiddenKeys() == null ? Set.of()
                : new LinkedHashSet<>(contract.forbiddenKeys());

        for (int i = 0; i < items.size(); i++) {
            Set<String> rowKeys = new TreeSet<>(items.get(i).keySet());
            Set<String> missing = new TreeSet<>(required);
            missing.removeAll(rowKeys);
            Set<String> extra = new TreeSet<>(rowKeys);
            extra.removeAll(allowed);
            Set<String> forbiddenHit = new TreeSet<>(rowKeys);
            forbiddenHit.retainAll(forbidden);

            if (missing.isEmpty() && extra.isEmpty() && forbiddenHit.isEmpty()) {
                continue;
            }
            StringBuilder message = new StringBuilder("第 ").append(i + 1).append(" 条数据的字段与任务导入契约不一致。");
            if (!missing.isEmpty()) {
                message.append(" 缺少必填列: ").append(String.join(", ", missing));
            }
            if (!extra.isEmpty()) {
                message.append(" 多余列: ").append(String.join(", ", extra));
            }
            if (!forbiddenHit.isEmpty()) {
                message.append(" 禁止列: ").append(String.join(", ", forbiddenHit));
            }
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, message.toString());
        }
    }

    public static Map<String, Object> filterRowForContract(Map<String, Object> row, TaskImportPayloadContract contract,
            List<ImportColumnBinding> bindings) {
        if (row == null) {
            return Map.of();
        }
        Set<String> allowed = new LinkedHashSet<>();
        if (contract != null) {
            allowed.addAll(contract.requiredKeys());
            allowed.addAll(contract.optionalKeys());
        } else if (bindings != null) {
            for (ImportColumnBinding binding : bindings) {
                if (binding == null || binding.key() == null) {
                    continue;
                }
                String role = binding.role() == null ? "" : binding.role().trim().toLowerCase();
                if ("display".equals(role) || "input".equals(role)) {
                    allowed.add(binding.key().trim());
                }
            }
        } else {
            return row;
        }
        java.util.LinkedHashMap<String, Object> filtered = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (allowed.contains(entry.getKey())) {
                filtered.put(entry.getKey(), entry.getValue());
            }
        }
        return filtered;
    }

    public static void assertTemplateSchemaRespectsContract(ObjectMapper objectMapper,
            Map<String, Object> schemaRoot, TaskImportPayloadContract contract) {
        if (contract == null || contract.requiredKeys() == null || contract.requiredKeys().isEmpty()) {
            return;
        }
        java.util.Set<String> displayBindings = new java.util.TreeSet<>();
        collectDisplayBindingsFromSchemaRoot(schemaRoot, displayBindings);
        java.util.List<String> missing = new java.util.ArrayList<>();
        for (String required : contract.requiredKeys()) {
            if (!displayBindings.contains(required)) {
                missing.add(required);
            }
        }
        if (missing.isEmpty()) {
            return;
        }
        throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                "模板不能移除或改名已锁定的题目列: " + String.join(", ", missing)
                        + "。请保留对应字段且导入角色为展示，或扩展任务导入契约。");
    }

    @SuppressWarnings("unchecked")
    private static void collectDisplayBindingsFromSchemaRoot(Map<String, Object> root, java.util.Set<String> displayBindings) {
        Object sectionsObj = root.get("sections");
        if (!(sectionsObj instanceof List<?> sections)) {
            return;
        }
        for (Object sectionObj : sections) {
            if (sectionObj instanceof Map<?, ?> section) {
                Object fieldsObj = section.get("fields");
                if (fieldsObj instanceof List<?> fields) {
                    collectDisplayBindingsFromFields(fields, displayBindings);
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static void collectDisplayBindingsFromFields(List<?> fields, java.util.Set<String> displayBindings) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            String binding = resolveBinding(field);
            if (binding != null && isDisplayImportField(field)) {
                displayBindings.add(binding);
            }
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                collectDisplayBindingsFromFields(nestedFields, displayBindings);
            }
        }
    }

    private static boolean isDisplayImportField(Map<?, ?> field) {
        if (isRuntimeField(field)) {
            return false;
        }
        String role = resolveImportRole(field);
        if ("display".equals(role)) {
            return true;
        }
        if ("input".equals(role) || "runtime".equals(role)) {
            return false;
        }
        return Boolean.TRUE.equals(field.get("readonly")) || Boolean.TRUE.equals(field.get("readOnly"));
    }

    @SuppressWarnings("unchecked")
    private static String resolveImportRole(Map<?, ?> field) {
        Object meta = field.get("meta");
        if (meta instanceof Map<?, ?> metaMap) {
            Object role = metaMap.get("importRole");
            if (role != null) {
                return role.toString().trim().toLowerCase();
            }
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private static void collectContractKeysFromFields(List<?> fields, Set<String> required, Set<String> optional,
            Set<String> runtime) {
        for (Object fieldObj : fields) {
            if (!(fieldObj instanceof Map<?, ?> field)) {
                continue;
            }
            String binding = resolveBinding(field);
            if (binding == null) {
                Object nested = field.get("fields");
                if (nested instanceof List<?> nestedFields) {
                    collectContractKeysFromFields(nestedFields, required, optional, runtime);
                }
                continue;
            }
            if (isRuntimeField(field)) {
                runtime.add(binding);
                continue;
            }
            String role = resolveImportRole(field);
            if ("display".equals(role) || (role.isEmpty() && isDisplayImportField(field))) {
                required.add(binding);
            } else {
                optional.add(binding);
            }
            Object nested = field.get("fields");
            if (nested instanceof List<?> nestedFields) {
                collectContractKeysFromFields(nestedFields, required, optional, runtime);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static boolean isRuntimeField(Map<?, ?> field) {
        Object component = field.get("component");
        if (component != null) {
            String name = component.toString().toLowerCase();
            if (name.startsWith("llm")) {
                return true;
            }
        }
        Object meta = field.get("meta");
        if (meta instanceof Map<?, ?> metaMap) {
            Object role = metaMap.get("importRole");
            if (role != null && "runtime".equalsIgnoreCase(role.toString())) {
                return true;
            }
            Object source = metaMap.get("payloadSource");
            if (source != null && "runtime".equalsIgnoreCase(source.toString())) {
                return true;
            }
            Object allowImport = metaMap.get("allowImport");
            if (Boolean.TRUE.equals(allowImport)) {
                return false;
            }
        }
        return false;
    }

    private static String resolveBinding(Map<?, ?> field) {
        Object path = field.get("path");
        Object key = field.get("key");
        if (path != null && !path.toString().isBlank()) {
            return path.toString();
        }
        if (key != null && !key.toString().isBlank()) {
            return key.toString();
        }
        return null;
    }

    private static List<String> readStringList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (Object item : list) {
            if (item != null && !item.toString().isBlank()) {
                out.add(item.toString().trim());
            }
        }
        return distinctSorted(out);
    }

    private static List<String> distinctSorted(List<String> keys) {
        return new ArrayList<>(new TreeSet<>(keys));
    }
}
