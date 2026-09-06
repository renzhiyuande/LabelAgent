package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import java.time.Instant;

@Getter
@Setter
@ToString
@TableName("assignments")
public class AssignmentEntity extends AbstractEntity {
    private Long taskId;
    private Long itemId;
    private Integer slotNo;
    private Long labelerId;
    private String assignType;
    private String claimSource;
    private String status;
    private Integer currentRoundNo;
    private Long assignedBy;
    private Instant assignedAt;
    private Instant claimedAt;
    private Instant deadlineAt;
    private Instant closedAt;
    private Instant canceledAt;
    private Instant revokedAt;
    private String cancelReason;
}
