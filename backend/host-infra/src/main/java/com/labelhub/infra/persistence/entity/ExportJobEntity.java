package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("export_jobs")
public class ExportJobEntity extends AbstractEntity {
    private Long taskId;
    private String bizType;
    private Long sourceBizId;
    private Long requestedBy;
    private String exportScope;
    private String templateScope;
    private String formatCode;
    private String fieldMapJson;
    private String fieldRenameJson;
    private String filtersJson;
    private Long acceptanceId;
    private Integer includeReviewFlag;
    private Integer includeAiReviewFlag;
    private String status;
    private Integer progressPercent;
    private Integer totalRecords;
    private Integer exportedRecords;
    private Long resultFileId;
    private Long asyncTaskId;
    private String checksum;
    private String errorMessage;
    private Instant startedAt;
    private Instant finishedAt;
    private Instant canceledAt;
    private Instant expireAt;
}
