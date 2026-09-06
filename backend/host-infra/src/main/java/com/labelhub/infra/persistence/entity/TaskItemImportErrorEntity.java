package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("task_item_import_errors")
public class TaskItemImportErrorEntity extends AbstractEntity {
    private Long batchId;
    private Integer rowNo;
    private String errorCode;
    private String errorMessage;
    private String rawLineText;
    private String rawPayloadJson;
    private String normalizedPayloadJson;
    private Integer isBlocking;
}
