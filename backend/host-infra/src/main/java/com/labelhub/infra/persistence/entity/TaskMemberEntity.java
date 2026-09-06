package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("task_members")
public class TaskMemberEntity extends AbstractEntity {
    private Long taskId;
    private Long userId;
    private String memberRole;
    private String permissionSetJson;
    private String status;
    private Instant joinedAt;
}
