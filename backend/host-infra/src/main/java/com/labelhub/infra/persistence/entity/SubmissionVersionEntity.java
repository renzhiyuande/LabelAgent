package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("submission_versions")
public class SubmissionVersionEntity extends AbstractEntity {
    private Long submissionId;
    private Long assignmentId;
    private Long taskId;
    private Long itemId;
    private Long labelerId;
    private Integer roundNo;
    private Long templateVersionId;
    private String submitSource;
    private String submitDataJson;
    private String submitDataHash;
    private Long previousVersionId;
    private Instant submittedAt;
}
