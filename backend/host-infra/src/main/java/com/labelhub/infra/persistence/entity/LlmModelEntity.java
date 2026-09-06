package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("llm_models")
public class LlmModelEntity extends AbstractEntity {
    private Long providerId;
    private String modelCode;
    private String modelName;
    private String modelType;
    private String modelVersion;
    private Integer contextWindow;
    private Integer maxOutputTokens;
    @TableField("cost_per_1k_input_tokens")
    private BigDecimal costPer1kInputTokens;
    @TableField("cost_per_1k_output_tokens")
    private BigDecimal costPer1kOutputTokens;
    private String supportedFeaturesJson;
    private String modelConfigJson;
    private Integer isDefaultForProvider;
    private String status;
}
