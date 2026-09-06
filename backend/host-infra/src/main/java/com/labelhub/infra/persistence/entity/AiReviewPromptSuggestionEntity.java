package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("ai_review_prompt_suggestions")
public class AiReviewPromptSuggestionEntity extends AbstractEntity {
    private Long templateVersionId;
    private Long taskId;
    private Long ownerId;
    private String baselinePromptTemplate;
    private String candidatePromptTemplate;
    private String changeSummary;
    private String baselineMetricsJson;
    private String abTestReportJson;
    private String status;
    private Long decidedBy;
    private Instant decidedAt;
    private String dismissReason;
    private Long acceptedTemplateVersionId;
    private Instant cooldownUntil;
}
