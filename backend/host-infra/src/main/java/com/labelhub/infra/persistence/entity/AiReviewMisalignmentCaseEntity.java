package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("ai_review_misalignment_cases")
public class AiReviewMisalignmentCaseEntity extends AbstractEntity {
    private Long templateVersionId;
    private Long taskId;
    private Long submissionId;
    private Long submissionVersionId;
    private Long aiReviewId;
    private String aiVerdict;
    private String humanLabel;
    private String misalignmentType;
    private Long appealId;
    private String itemPayloadJson;
    private String submitDataJson;
    private String aiSummaryText;
    private String aiDimensionScoresJson;
    private String humanCommentText;
    private String splitTag;
}
