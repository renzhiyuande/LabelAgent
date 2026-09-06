package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("template_versions")
public class TemplateVersionEntity extends AbstractEntity {
    private Long templateId;
    private Long taskId;
    private Integer versionNo;
    private String templateName;
    private String status;
    private Integer isCurrent;
    private String schemaJson;
    private String schemaChecksum;
    private String reviewPromptTemplate;
    private String reviewOutputSchemaJson;
    private String reviewWorkflowJson;
    private String acceptanceRuleJson;
    private String llmAssistConfigJson;
    private String providerPlatformKey;
    private String modelId;
    private Integer widgetCount;
    private Integer requiredFieldCount;
    private String validationErrorsJson;
    private Instant publishedAt;
    private Instant archivedAt;
    private String archivedReason;
}
