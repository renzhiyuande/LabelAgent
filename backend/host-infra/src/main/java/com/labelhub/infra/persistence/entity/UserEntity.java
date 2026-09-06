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
@TableName("users")
public class UserEntity extends AbstractEntity {
    private String username;
    private String passwordHash;
    private String displayName;
    private String email;
    private String phone;
    private Long avatarFileId;
    private String status;
    private Instant lastLoginAt;
    private String registerSource;
}
