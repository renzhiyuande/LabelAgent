package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("template_review_dimensions")
public class TemplateReviewDimensionEntity extends AbstractEntity {
    private Long templateVersionId;
    private String dimensionKey;
    private String dimensionName;
    private String dimensionDesc;
    private BigDecimal weight;
    private BigDecimal scoreMin;
    private BigDecimal scoreMax;
    private BigDecimal passThreshold;
    private BigDecimal rejectThreshold;
    private String promptInstruction;
    private String manualReviewHint;
    private String severityLevel;
    private Integer sortNo;
    private Integer requiredFlag;
}
