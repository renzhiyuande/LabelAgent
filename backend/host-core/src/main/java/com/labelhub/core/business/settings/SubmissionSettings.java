package com.labelhub.core.business.settings;

import java.util.Map;

public record SubmissionSettings(WithdrawSettings withdraw, AppealSettings appeal) {

    static SubmissionSettings defaults() {
        return new SubmissionSettings(WithdrawSettings.defaults(), AppealSettings.defaults());
    }

    static SubmissionSettings from(Map<String, Object> json) {
        if (json == null || json.isEmpty()) {
            return defaults();
        }
        return new SubmissionSettings(
                WithdrawSettings.from(SettingsJsonSupport.childMap(json, "withdraw")),
                AppealSettings.from(SettingsJsonSupport.childMap(json, "appeal")));
    }
}
