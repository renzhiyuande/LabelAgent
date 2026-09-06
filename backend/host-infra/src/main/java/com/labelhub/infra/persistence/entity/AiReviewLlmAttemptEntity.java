package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("ai_review_llm_attempts")
public class AiReviewLlmAttemptEntity extends AbstractEntity {
    private Long aiReviewId;
    private Long submissionId;
    private Long submissionVersionId;
    private Long taskId;
    private Integer attemptNo;
    private String platformKey;
    private String modelId;
    private String providerRequestId;
    private String promptSnapshot;
    private String responseSnapshot;
    private String errorMessage;
    private Integer successFlag;
    private Integer latencyMs;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private Integer historyBackfillFlag;
    private String traceabilityStatus;
    private String historyGapReason;
    private Instant startedAt;
    private Instant finishedAt;
}
