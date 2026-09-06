package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@TableName("permissions")
public class PermissionEntity extends AbstractEntity {
    private String permissionCode;
    private String permissionName;
    private String moduleCode;
    private String apiPattern;
    private String status;
}
