package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("sys_user_notification")
public class UserNotificationEntity extends AbstractEntity {
    private Long recipientUserId;
    private String notificationType;
    private String title;
    private String body;
    private String linkUrl;
    private String bizType;
    private Long bizId;
    private Long senderUserId;
    private Integer readFlag;
    private Instant readAt;
}
