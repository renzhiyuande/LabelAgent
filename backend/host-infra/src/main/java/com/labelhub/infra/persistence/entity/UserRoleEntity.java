package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@TableName("user_roles")
public class UserRoleEntity extends AbstractEntity {
    private Long userId;
    private Long roleId;
    private Instant effectiveAt;
    private Instant expiredAt;
}
