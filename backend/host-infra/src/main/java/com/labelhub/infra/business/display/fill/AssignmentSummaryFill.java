package com.labelhub.infra.business.display.fill;

import cn.crane4j.annotation.Assemble;
import cn.crane4j.annotation.Mapping;
import com.labelhub.infra.business.display.container.DisplayContainerNamespaces;
import java.time.Instant;
import java.util.Map;
import lombok.Data;

@Data
public class AssignmentSummaryFill {
    private Long id;
    private Integer slotNo;
    private String assignType;
    private String status;
    private Instant assignedAt;
    private Instant claimedAt;
    private Instant deadlineAt;
    private Instant createdAt;

    private String taskTitle;
    private String taskCode;
    private Integer itemSeqNo;
    private String sourceItemKey;
    private String labelerName;
    private String itemPayloadJson;
    private Map<String, Object> payloadPreview;

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
}
