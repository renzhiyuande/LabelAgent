package com.labelhub.infra.business.export.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import com.labelhub.infra.system.admin.DictAdminService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** 导出列中文表头与字典/选项值映射。 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ExportFieldDisplaySupport {

    private static final Map<String, String> BUILTIN_FIELD_DICT_CODES = Map.of(
            "lifecycle.status", "submission_status");

    private static final Map<String, String> REVIEW_ACTION_LABELS = Map.of(
            "APPROVE", "通过",
            "REJECT", "拒绝",
            "RETURN", "退回");

    private final TaskMapper taskMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final DictAdminService dictAdminService;
    private final ObjectMapper objectMapper;

    public ExportFieldDisplaySupport(
            TaskMapper taskMapper,
            TemplateVersionMapper templateVersionMapper,
            DictAdminService dictAdminService,
            ObjectMapper objectMapper) {
        this.taskMapper = taskMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.dictAdminService = dictAdminService;
        this.objectMapper = objectMapper;
    }

    public DisplayContext buildContext(Long taskId, List<String> selectedFields) {
        Map<String, FieldDisplayMeta> metaByFieldKey = new LinkedHashMap<>();
        registerBuiltinFields(metaByFieldKey);

        if (taskId != null) {
            TaskEntity task = taskMapper.selectById(taskId);
            if (task != null && task.getDeletedFlag() != 1 && task.getCurrentTemplateVersionId() != null) {
                TemplateVersionEntity version = templateVersionMapper.selectById(task.getCurrentTemplateVersionId());
                if (version != null && version.getDeletedFlag() != 1) {
                    registerTemplateFields(metaByFieldKey, version.getSchemaJson());
                }
            }
        }

        Map<String, Map<String, String>> dictLabelByCode = new HashMap<>();
        for (String fieldKey : selectedFields) {
            FieldDisplayMeta meta = metaByFieldKey.get(fieldKey);
            if (meta != null && meta.dictCode() != null && !meta.dictCode().isBlank()) {
                dictLabelByCode.computeIfAbsent(meta.dictCode(), code -> toValueLabelMap(dictAdminService.getActiveDictOptions(code)));
            }
        }

        return new DisplayContext(metaByFieldKey, dictLabelByCode, selectedFields, objectMapper);
    }

    private void registerBuiltinFields(Map<String, FieldDisplayMeta> metaByFieldKey) {
        for (ExportFieldCatalogSupport.ExportFieldDef field : ExportFieldCatalogSupport.lifecycleFields()) {
            String dictCode = BUILTIN_FIELD_DICT_CODES.get(field.value());
            metaByFieldKey.put(field.value(), new FieldDisplayMeta(field.label(), "生命周期", dictCode, Map.of()));
        }
        for (ExportFieldCatalogSupport.ExportFieldDef field : ExportFieldCatalogSupport.reviewFields()) {
            metaByFieldKey.put(field.value(), new FieldDisplayMeta(field.label(), "审核", null, Map.of()));
        }
    }

    private void registerTemplateFields(Map<String, FieldDisplayMeta> metaByFieldKey, String schemaJson) {
        ExportSchemaFieldSupport.loadTemplateFields(schemaJson, objectMapper).forEach((binding, field) -> {
            String prefix = switch (field.role()) {
                case PAYLOAD -> ExportFieldCatalogSupport.PREFIX_PAYLOAD;
                case ANNOTATE -> ExportFieldCatalogSupport.PREFIX_ANNOTATE;
                case RUNTIME -> ExportFieldCatalogSupport.PREFIX_RUNTIME;
            };
            String group = switch (field.role()) {
                case PAYLOAD -> "题目展示";
                case ANNOTATE -> "标注作答";
                case RUNTIME -> "运行时镜像";
            };
            metaByFieldKey.put(prefix + binding, new FieldDisplayMeta(
                    field.label(), group, field.dictCode(), field.staticOptionLabels()));
        });
    }

    public record FieldDisplayMeta(
            String label,
            String group,
            String dictCode,
            Map<String, String> staticOptionLabels) {
    }

    public static final class DisplayContext {
        private final Map<String, FieldDisplayMeta> metaByFieldKey;
        private final Map<String, Map<String, String>> dictLabelByCode;
        private final Map<String, String> headerByFieldKey;
        private final List<String> orderedHeaders;

        private final ObjectMapper objectMapper;

        private DisplayContext(
                Map<String, FieldDisplayMeta> metaByFieldKey,
                Map<String, Map<String, String>> dictLabelByCode,
                List<String> selectedFields,
                ObjectMapper objectMapper) {
            this.metaByFieldKey = metaByFieldKey;
            this.dictLabelByCode = dictLabelByCode;
            this.objectMapper = objectMapper;
            this.headerByFieldKey = new LinkedHashMap<>();
            this.orderedHeaders = new ArrayList<>();
            Map<String, Integer> headerUsage = new HashMap<>();

            for (String fieldKey : selectedFields) {
                String baseHeader = resolveBaseHeader(fieldKey);
                String header = dedupeHeader(baseHeader, headerUsage);
                headerByFieldKey.put(fieldKey, header);
                orderedHeaders.add(header);
            }
        }

        public List<String> headers() {
            return orderedHeaders;
        }

        public String headerFor(String fieldKey) {
            return headerByFieldKey.getOrDefault(fieldKey, ExportSubmissionRowBuilder.fallbackColumnKey(fieldKey));
        }

        public Object formatValue(String fieldKey, Object raw) {
            if (raw == null) {
                return null;
            }
            if ("review.lastHumanAction".equals(fieldKey) && raw instanceof String action) {
                return REVIEW_ACTION_LABELS.getOrDefault(action, action);
            }

            FieldDisplayMeta meta = metaByFieldKey.get(fieldKey);
            if (meta == null) {
                return formatGenericValue(objectMapper, raw);
            }
            if (!meta.staticOptionLabels().isEmpty()) {
                return formatWithOptionMap(raw, meta.staticOptionLabels());
            }
            if (meta.dictCode() != null && !meta.dictCode().isBlank()) {
                Map<String, String> dictLabels = dictLabelByCode.getOrDefault(meta.dictCode(), Map.of());
                if (!dictLabels.isEmpty()) {
                    return formatWithOptionMap(raw, dictLabels);
                }
            }
            return formatGenericValue(objectMapper, raw);
        }

        public Map<String, Object> toDisplayRow(Map<String, Object> rawByFieldKey) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : rawByFieldKey.entrySet()) {
                row.put(headerFor(entry.getKey()), formatValue(entry.getKey(), entry.getValue()));
            }
            return row;
        }

        private String resolveBaseHeader(String fieldKey) {
            FieldDisplayMeta meta = metaByFieldKey.get(fieldKey);
            if (meta != null) {
                return "【" + meta.group() + "】" + meta.label();
            }
            return ExportSubmissionRowBuilder.fallbackColumnKey(fieldKey);
        }

        private static String dedupeHeader(String baseHeader, Map<String, Integer> headerUsage) {
            int count = headerUsage.merge(baseHeader, 1, Integer::sum);
            if (count == 1) {
                return baseHeader;
            }
            return baseHeader + "_" + count;
        }
    }

    private static Map<String, String> toValueLabelMap(List<OptionItem> options) {
        Map<String, String> labels = new LinkedHashMap<>();
        for (OptionItem option : options) {
            if (option.value() == null) {
                continue;
            }
            String valueKey = String.valueOf(option.value());
            String label = option.label();
            labels.put(valueKey, label == null || label.isBlank() ? valueKey : label.trim());
        }
        return labels;
    }

    private static Object formatWithOptionMap(Object raw, Map<String, String> optionLabels) {
        if (raw instanceof List<?> list) {
            List<String> parts = new ArrayList<>();
            for (Object item : list) {
                String text = formatScalar(item, optionLabels);
                if (text != null && !text.isBlank()) {
                    parts.add(text);
                }
            }
            return parts.isEmpty() ? null : String.join(", ", parts);
        }
        return formatScalar(raw, optionLabels);
    }

    private static String formatScalar(Object raw, Map<String, String> optionLabels) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Boolean bool) {
            return bool ? "是" : "否";
        }
        String key = String.valueOf(raw);
        return optionLabels.getOrDefault(key, key);
    }

    private static Object formatGenericValue(ObjectMapper objectMapper, Object raw) {
        if (raw instanceof Map<?, ?> || raw instanceof List<?>) {
            try {
                return objectMapper.writeValueAsString(raw);
            } catch (Exception ex) {
                return String.valueOf(raw);
            }
        }
        return raw;
    }
}
