package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("task_item_import_batches")
public class TaskItemImportBatchEntity extends AbstractEntity {
    private Long taskId;
    private Long sourceFileId;
    private String sourceFilename;
    private String sourceFormat;
    private String importStatus;
    private String overwriteMode;
    private String fileChecksum;
    private Integer totalRows;
    private Integer successRows;
    private Integer failedRows;
    private String errorSummaryJson;
    private Instant startedAt;
    private Instant finishedAt;
}
