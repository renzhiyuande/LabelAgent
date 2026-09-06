package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("template_version_fields")
public class TemplateVersionFieldEntity extends AbstractEntity {
    private Long templateVersionId;
    private String fieldCode;
    private String fieldPath;
    private String fieldTitle;
    private String widgetType;
    private String valueType;
    private Integer isRequired;
    private Integer isDisplayOnly;
    private Integer sortNo;
    private String defaultValueJson;
    private String validatorRuleJson;
    private String linkageRuleJson;
    private String visibilityRuleJson;
    private String dependencyFieldCodesJson;
    private String enumOptionsJson;
    private String widgetConfigJson;
}
