package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("llm_assist_records")
public class LlmAssistRecordEntity extends AbstractEntity {
    private Long submissionId;
    private Long assignmentId;
    private Long taskId;
    private Long templateVersionId;
    private String fieldCode;
    private String platformKey;
    private String modelId;
    private String promptText;
    private String responseText;
    private String parsedOutputJson;
    private String status;
    private Integer totalTokens;
    private Integer latencyMs;
    private Long invokedBy;
    private Instant invokedAt;
}
