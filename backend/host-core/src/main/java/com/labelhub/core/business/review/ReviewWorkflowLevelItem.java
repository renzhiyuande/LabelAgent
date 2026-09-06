package com.labelhub.core.business.review;

import com.labelhub.core.lowcode.schema.LhSchemaComponent;
import com.labelhub.core.lowcode.schema.LhSchemaField;
import com.labelhub.core.lowcode.schema.LhSchemaOption;
import com.labelhub.core.lowcode.schema.LhSchemaRule;
import java.util.List;

public record ReviewWorkflowLevelItem(
        @LhSchemaField(
                label = "展示名称",
                component = LhSchemaComponent.TEXT,
                required = true,
                rules = @LhSchemaRule(type = "maxLength", value = "64", message = "展示名称不能超过 64 字符"))
        String label,
        @LhSchemaField(
                label = "可用操作",
                component = LhSchemaComponent.CHECKBOX_GROUP,
                required = true,
                options = {
                    @LhSchemaOption(label = "通过", value = "approve"),
                    @LhSchemaOption(label = "驳回", value = "reject"),
                    @LhSchemaOption(label = "退回修改", value = "return")
                })
        List<String> actions) {
}
