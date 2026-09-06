package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import java.time.Instant;

@Getter
@Setter
@ToString
@TableName("submissions")
public class SubmissionEntity extends AbstractEntity {
    private Long assignmentId;
    private Long taskId;
    private Long itemId;
    private Long labelerId;
    private Long currentTemplateVersionId;
    private Long currentVersionId;
    private Long approvedVersionId;
    private Integer currentRoundNo;
    private String currentStatus;
    private String currentReviewLevel;
    private String nextReviewLevel;
    private String draftDataJson;
    private String draftChecksum;
    private Instant draftSavedAt;
    private Integer submitCount;
    private Integer returnCount;
    private Integer withdrawCount;
    private Integer appealCount;
    private Integer reopenCount;
    private Instant lastSubmittedAt;
    private Instant lastWithdrawnAt;
    private Instant lastAppealedAt;
    private Instant revisionRequiredAt;
    private Instant revisionDeadlineAt;
    private Instant finalizedAt;
    private String lastActionCode;
    private Instant lastActionAt;
    private String lastReturnReasonText;
    private Long lastAiReviewId;
    private Long lastReviewRecordId;
    private Integer versionNo;
    /** 1 = assignment 当前有效 submission；null = 已归档 */
    private Integer isCurrent;
    private Instant supersededAt;
    private String supersededReason;
}
