package com.labelhub.core.business.settings;

import com.labelhub.core.lowcode.schema.LhSchemaField;
import com.labelhub.core.lowcode.schema.LhSchemaNested;
import com.labelhub.core.lowcode.schema.LhSchemaRoot;
import com.labelhub.core.lowcode.schema.LhSchemaSection;
import com.labelhub.core.lowcode.schema.LhSchemaSections;
import java.util.Map;

@LhSchemaRoot(
        namespace = TaskSettingsDocument.NAMESPACE,
        key = TaskSettingsDocument.KEY,
        label = "任务设置",
        title = "任务设置",
        description = "任务运行与标注行为相关配置。",
        permissions = {
                "system:admin",
                "business:task:read",
                "business:task:create",
                "business:task:update"
        })
@LhSchemaSections({
    @LhSchemaSection(key = "submission", title = "提交与申诉"),
    @LhSchemaSection(key = "annotation", title = "标注展示")
})
public record TaskSettingsDocument(
        @LhSchemaField(
                sectionKey = "annotation",
                label = "允许平局",
                component = com.labelhub.core.lowcode.schema.LhSchemaComponent.SWITCH,
                defaultValue = "false")
        Boolean allowTie,
        @LhSchemaField(
                sectionKey = "annotation",
                label = "展示模型名称",
                component = com.labelhub.core.lowcode.schema.LhSchemaComponent.SWITCH,
                defaultValue = "true")
        Boolean showModelName,
        @LhSchemaNested(sectionKey = "submission") SubmissionSettings submission) {

    public static final String NAMESPACE = "taskSettings";
    public static final String KEY = "default";

    public static TaskSettingsDocument defaults() {
        return new TaskSettingsDocument(false, true, SubmissionSettings.defaults());
    }

    public static TaskSettingsDocument from(Map<String, Object> root) {
        if (root == null || root.isEmpty()) {
            return defaults();
        }
        TaskSettingsDocument defaults = defaults();
        return new TaskSettingsDocument(
                SettingsJsonSupport.readBoolean(root.get("allowTie"), defaults.allowTie()),
                SettingsJsonSupport.readBoolean(root.get("showModelName"), defaults.showModelName()),
                SubmissionSettings.from(SettingsJsonSupport.childMap(root, "submission")));
    }

    public WithdrawSettings withdraw() {
        return submission == null ? WithdrawSettings.defaults() : submission.withdraw();
    }

    public AppealSettings appeal() {
        return submission == null ? AppealSettings.defaults() : submission.appeal();
    }
}
