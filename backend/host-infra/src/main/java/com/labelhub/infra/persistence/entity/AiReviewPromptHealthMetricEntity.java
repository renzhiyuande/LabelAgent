package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("ai_review_prompt_health_metrics")
public class AiReviewPromptHealthMetricEntity extends AbstractEntity {
    private Long templateVersionId;
    private Long taskId;
    private LocalDate metricDate;
    private Integer windowDays;
    private Integer sampleCount;
    private String metricsJson;
    private String healthStatus;
}
