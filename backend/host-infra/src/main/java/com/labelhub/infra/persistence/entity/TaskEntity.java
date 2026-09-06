package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("tasks")
public class TaskEntity extends AbstractEntity {
    private String taskCode;
    private Long ownerId;
    private String title;
    private String descriptionText;
    private String descriptionRich;
    private String sceneCode;
    private String status;
    private String distributeStrategy;
    private Integer quota;
    private Integer maxClaimPerUser;
    private Integer acceptanceRequiredFlag;
    private String acceptanceStatus;
    private Long latestAcceptanceId;
    private String rewardSettlementStatus;
    private Instant deadlineAt;
    private Instant publishedAt;
    private Instant pausedAt;
    private Instant finishedAt;
    private Instant archivedAt;
    private Instant restoredAt;
    private Long currentTemplateVersionId;
    private String tagsJson;
    private String rewardRuleJson;
    private String settingsJson;
    private String importPayloadContractJson;
    private String publishedCheckResultJson;
    private String statusReason;
    private String reviewWorkflowJson;
    private Integer versionNo;
}
