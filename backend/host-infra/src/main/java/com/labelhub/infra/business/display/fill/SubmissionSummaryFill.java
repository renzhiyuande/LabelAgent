package com.labelhub.infra.business.display.fill;

import cn.crane4j.annotation.Assemble;
import cn.crane4j.annotation.Mapping;
import com.labelhub.infra.business.display.container.DisplayContainerNamespaces;
import java.time.Instant;
import java.util.Map;
import lombok.Data;

@Data
public class SubmissionSummaryFill {
    private Long id;
    private String status;
    private Integer currentRoundNo;
    private Instant draftSavedAt;
    private Instant lastSubmittedAt;
    private Instant createdAt;
    private Integer submitCount;

    private String taskTitle;
    private String taskCode;
    private Integer itemSeqNo;
    private String sourceItemKey;
    private String labelerName;
    private String itemPayloadJson;
    private Map<String, Object> payloadPreview;

    /** 由 {@link com.labelhub.infra.business.display.assembler.SubmissionSummaryAssembler} 批量填充。 */
    private Long ownerId;
    private String ownerName;

    private String assignmentStatus;
    private String assignmentAssignType;
    private Integer assignmentSlotNo;
    private Instant assignmentClaimedAt;
    private Instant assignmentDeadlineAt;

    private String reviewerName;

    /** 由 {@link com.labelhub.infra.business.display.assembler.SubmissionSummaryAssembler} 批量填充。 */
    private String draftPreviewText;
    private Boolean canWithdraw;
    private Boolean canAppeal;
    private String withdrawBlockReason;
    private String appealBlockReason;

    @Assemble(
            container = DisplayContainerNamespaces.TASK,
            props = {
                    @Mapping(src = "title", ref = "taskTitle"),
                    @Mapping(src = "taskCode", ref = "taskCode")
            })
    private Long taskId;

    @Assemble(
            container = DisplayContainerNamespaces.TASK_ITEM,
            props = {
                    @Mapping(src = "seqNo", ref = "itemSeqNo"),
                    @Mapping(src = "sourceItemKey", ref = "sourceItemKey"),
                    @Mapping(src = "payloadJson", ref = "itemPayloadJson")
            })
    private Long itemId;

    @Assemble(
            container = DisplayContainerNamespaces.USER_DISPLAY_NAME,
            props = @Mapping(src = "displayName", ref = "labelerName"))
    private Long labelerId;

    @Assemble(
            container = DisplayContainerNamespaces.ASSIGNMENT,
            props = {
                    @Mapping(src = "status", ref = "assignmentStatus"),
                    @Mapping(src = "assignType", ref = "assignmentAssignType"),
                    @Mapping(src = "slotNo", ref = "assignmentSlotNo"),
                    @Mapping(src = "claimedAt", ref = "assignmentClaimedAt"),
                    @Mapping(src = "deadlineAt", ref = "assignmentDeadlineAt")
            })
    private Long assignmentId;

    @Assemble(
            container = DisplayContainerNamespaces.REVIEW_RECORD,
            props = @Mapping(src = "reviewerId", ref = "reviewerId"))
    private Long lastReviewRecordId;

    @Assemble(
            container = DisplayContainerNamespaces.USER_DISPLAY_NAME,
            props = @Mapping(src = "displayName", ref = "reviewerName"))
    private Long reviewerId;
}
