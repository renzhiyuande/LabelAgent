package com.labelhub.core.business.settings;

import com.labelhub.core.lowcode.schema.LhSchemaField;
import java.util.Map;
import java.util.Set;

public record WithdrawSettings(
        @LhSchemaField(
                label = "允许标注员撤回提交",
                component = com.labelhub.core.lowcode.schema.LhSchemaComponent.SWITCH,
                defaultValue = "true")
        boolean enabled,
        @LhSchemaField(visible = false) Set<String> allowedBeforeStatuses,
        @LhSchemaField(
                label = "单条最大撤回次数",
                component = com.labelhub.core.lowcode.schema.LhSchemaComponent.NUMBER,
                defaultValue = "1")
        Integer maxWithdrawCount) {

    public static final Set<String> DEFAULT_ALLOWED_BEFORE_STATUSES =
            Set.of("SUBMITTED", "AI_REVIEWING", "AI_PASSED");

    static WithdrawSettings defaults() {
        return new WithdrawSettings(true, DEFAULT_ALLOWED_BEFORE_STATUSES, 1);
    }

    static WithdrawSettings from(Map<String, Object> json) {
        WithdrawSettings defaults = defaults();
        Set<String> statuses = SettingsJsonSupport.readStatusSet(
                json.get("allowedBeforeStatuses"), defaults.allowedBeforeStatuses());
        return new WithdrawSettings(
                SettingsJsonSupport.readBoolean(json.get("enabled"), defaults.enabled()),
                statuses,
                SettingsJsonSupport.readInteger(json.get("maxWithdrawCount"), defaults.maxWithdrawCount()));
    }
}
