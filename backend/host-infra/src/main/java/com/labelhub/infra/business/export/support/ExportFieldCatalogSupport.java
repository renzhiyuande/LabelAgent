package com.labelhub.infra.business.export.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.lowcode.LowCodeDtos.OptionItem;
import com.labelhub.core.lowcode.LowCodeDtos.TreeOptionItem;
import com.labelhub.infra.persistence.entity.TaskEntity;
import com.labelhub.infra.persistence.entity.TemplateVersionEntity;
import com.labelhub.infra.persistence.mapper.TaskMapper;
import com.labelhub.infra.persistence.mapper.TemplateVersionMapper;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 按任务模板 schema 生成导出字段候选项：生命周期、题目展示、标注作答、运行时镜像、审核结论。
 */
@Component
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ExportFieldCatalogSupport {

    static final String PREFIX_LIFECYCLE = "lifecycle.";
    static final String PREFIX_PAYLOAD = "payload.";
    static final String PREFIX_ANNOTATE = "annotate.";
    static final String PREFIX_RUNTIME = "runtime.";
    static final String PREFIX_REVIEW = "review.";

    private static final List<ExportFieldDef> LIFECYCLE_FIELDS = List.of(
            def(PREFIX_LIFECYCLE + "submissionId", "提交 ID"),
            def(PREFIX_LIFECYCLE + "taskId", "任务 ID"),
            def(PREFIX_LIFECYCLE + "itemId", "题目 ID"),
            def(PREFIX_LIFECYCLE + "assignmentId", "分配 ID"),
            def(PREFIX_LIFECYCLE + "labelerId", "标注员 ID"),
            def(PREFIX_LIFECYCLE + "sourceItemKey", "题目标识"),
            def(PREFIX_LIFECYCLE + "itemSeqNo", "题目序号"),
            def(PREFIX_LIFECYCLE + "status", "提交状态"),
            def(PREFIX_LIFECYCLE + "submitCount", "提交次数"),
            def(PREFIX_LIFECYCLE + "lastSubmittedAt", "最近提交时间"),
            def(PREFIX_LIFECYCLE + "finalizedAt", "定稿时间"));

    private static final List<ExportFieldDef> REVIEW_FIELDS = List.of(
            def(PREFIX_REVIEW + "lastHumanAction", "人工审核动作"),
            def(PREFIX_REVIEW + "lastHumanLevel", "人工审核层级"),
            def(PREFIX_REVIEW + "lastHumanComment", "人工审核意见"),
            def(PREFIX_REVIEW + "lastHumanAt", "人工审核时间"),
            def(PREFIX_REVIEW + "lastAiVerdict", "AI 审核结论"),
            def(PREFIX_REVIEW + "lastAiScore", "AI 审核总分"),
            def(PREFIX_REVIEW + "lastAiSummary", "AI 审核摘要"),
            def(PREFIX_REVIEW + "lastAiAt", "AI 审核时间"));

    private final TaskMapper taskMapper;
    private final TemplateVersionMapper templateVersionMapper;
    private final ObjectMapper objectMapper;

    public ExportFieldCatalogSupport(
            TaskMapper taskMapper,
            TemplateVersionMapper templateVersionMapper,
            ObjectMapper objectMapper) {
        this.taskMapper = taskMapper;
        this.templateVersionMapper = templateVersionMapper;
        this.objectMapper = objectMapper;
    }

    static List<ExportFieldDef> lifecycleFields() {
        return LIFECYCLE_FIELDS;
    }

    static List<ExportFieldDef> reviewFields() {
        return REVIEW_FIELDS;
    }

    public List<OptionItem> listFieldOptions(Long taskId) {
        return listFieldTreeOptions(taskId).stream()
                .flatMap(group -> flattenGroupOptions(group).stream())
                .toList();
    }

    public List<TreeOptionItem> listFieldTreeOptions(Long taskId) {
        if (taskId == null) {
            return List.of();
        }
        TaskEntity task = taskMapper.selectById(taskId);
        if (task == null || task.getDeletedFlag() == 1) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }

        List<TreeOptionItem> roots = new ArrayList<>();
        roots.add(toGroup("生命周期", LIFECYCLE_FIELDS));

        String schemaJson = resolveSchemaJson(task.getCurrentTemplateVersionId());
        Map<TemplateFieldRole, List<ExportFieldDef>> templateFields = loadTemplateFieldsByRole(schemaJson);
        roots.add(toGroup("题目展示", templateFields.get(TemplateFieldRole.PAYLOAD)));
        roots.add(toGroup("标注作答", templateFields.get(TemplateFieldRole.ANNOTATE)));
        roots.add(toGroup("运行时镜像", templateFields.get(TemplateFieldRole.RUNTIME)));
        roots.add(toGroup("审核", REVIEW_FIELDS));
        return roots;
    }

    private List<OptionItem> flattenGroupOptions(TreeOptionItem group) {
        List<OptionItem> items = new ArrayList<>();
        String groupLabel = group.label();
        for (TreeOptionItem child : group.children()) {
            items.add(toOption(def(String.valueOf(child.value()), child.label()), groupLabel));
        }
        return items;
    }

    private Map<TemplateFieldRole, List<ExportFieldDef>> loadTemplateFieldsByRole(String schemaJson) {
        Map<TemplateFieldRole, List<ExportFieldDef>> grouped = new EnumMap<>(TemplateFieldRole.class);
        for (TemplateFieldRole role : TemplateFieldRole.values()) {
            grouped.put(role, new ArrayList<>());
        }
        ExportSchemaFieldSupport.loadTemplateFields(schemaJson, objectMapper).forEach((binding, field) -> {
            String prefix = switch (field.role()) {
                case PAYLOAD -> PREFIX_PAYLOAD;
                case ANNOTATE -> PREFIX_ANNOTATE;
                case RUNTIME -> PREFIX_RUNTIME;
            };
            grouped.get(field.role()).add(def(prefix + binding, field.label()));
        });
        return grouped;
    }

    private static TreeOptionItem toGroup(String groupLabel, List<ExportFieldDef> fields) {
        List<TreeOptionItem> children = fields.stream()
                .map(field -> new TreeOptionItem(field.label(), field.value()))
                .toList();
        return new TreeOptionItem(groupLabel, groupLabel, children);
    }

    private String resolveSchemaJson(Long templateVersionId) {
        if (templateVersionId == null) {
            return null;
        }
        TemplateVersionEntity version = templateVersionMapper.selectById(templateVersionId);
        if (version == null || version.getDeletedFlag() == 1) {
            return null;
        }
        return version.getSchemaJson();
    }

    private static ExportFieldDef def(String value, String label) {
        return new ExportFieldDef(value, label);
    }

    private static OptionItem toOption(ExportFieldDef field, String group) {
        return new OptionItem("【" + group + "】" + field.label(), field.value());
    }

    record ExportFieldDef(String value, String label) {
    }

    enum TemplateFieldRole {
        PAYLOAD,
        ANNOTATE,
        RUNTIME
    }
}
