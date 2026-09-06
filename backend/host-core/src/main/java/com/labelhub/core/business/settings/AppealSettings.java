package com.labelhub.core.business.settings;

import com.labelhub.core.lowcode.schema.LhSchemaField;
import java.util.Map;

public record AppealSettings(
        @LhSchemaField(
                label = "允许标注员申诉",
                component = com.labelhub.core.lowcode.schema.LhSchemaComponent.SWITCH,
                defaultValue = "false")
        boolean enabled,
        @LhSchemaField(
                label = "单条最大申诉次数",
                component = com.labelhub.core.lowcode.schema.LhSchemaComponent.NUMBER,
                defaultValue = "1")
        Integer maxAppealsPerSubmission,
        @LhSchemaField(
                label = "申诉时效（小时）",
                component = com.labelhub.core.lowcode.schema.LhSchemaComponent.NUMBER,
                defaultValue = "72")
        Integer appealWindowHours) {

    static AppealSettings defaults() {
        return new AppealSettings(false, 1, 72);
    }

    static AppealSettings from(Map<String, Object> json) {
        AppealSettings defaults = defaults();
        return new AppealSettings(
                SettingsJsonSupport.readBoolean(json.get("enabled"), defaults.enabled()),
                SettingsJsonSupport.readInteger(json.get("maxAppealsPerSubmission"), defaults.maxAppealsPerSubmission()),
                SettingsJsonSupport.readInteger(json.get("appealWindowHours"), defaults.appealWindowHours()));
    }
}
