package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("template_review_dimension_packs")
public class TemplateReviewDimensionPackEntity extends AbstractEntity {
    private String packCode;
    private String packName;
    private String packDesc;
    private String sceneCode;
    private Integer isSystemPack;
    private String dimensionSpecsJson;
    private Integer sortNo;
    private Integer dimensionCount;
    private String status;
}
