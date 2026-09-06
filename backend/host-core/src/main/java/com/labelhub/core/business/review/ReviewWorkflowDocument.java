package com.labelhub.core.business.review;

import com.labelhub.core.lowcode.schema.LhSchemaArray;
import com.labelhub.core.lowcode.schema.LhSchemaComponent;
import com.labelhub.core.lowcode.schema.LhSchemaField;
import com.labelhub.core.lowcode.schema.LhSchemaRoot;
import com.labelhub.core.lowcode.schema.LhSchemaSection;
import com.labelhub.core.lowcode.schema.LhSchemaSections;
import java.util.List;

@LhSchemaRoot(
        namespace = ReviewWorkflowSchemas.NAMESPACE,
        key = ReviewWorkflowDocument.KEY,
        label = "人工审核流程",
        title = "人工审核流程",
        description = "配置人工审核阶段与每级可用操作；发布任务或模板后审核员按此流程处理。",
        permissions = {
                "system:admin",
                "business:task:read",
                "business:task:create",
                "business:task:update",
                "business:template:read",
                "business:template:update"
        })
@LhSchemaSections(@LhSchemaSection(key = "default", title = "审核级别"))
public record ReviewWorkflowDocument(
        @LhSchemaField(
                sectionKey = "default",
                label = "审核级别",
                component = LhSchemaComponent.ARRAY,
                required = true,
                description = "按顺序配置初审/复审/终审；每级至少选择一个可用操作，最多 5 级。",
                defaultValue =
                        "[{\"label\":\"初审\",\"actions\":[\"approve\",\"reject\",\"return\"]}]")
        @LhSchemaArray(itemRecord = ReviewWorkflowLevelItem.class, maxItems = 5)
        List<ReviewWorkflowLevelItem> levels) {

    public static final String KEY = "default";
}
