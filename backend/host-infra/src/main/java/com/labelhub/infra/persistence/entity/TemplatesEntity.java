package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("templates")
public class TemplatesEntity extends AbstractEntity {
    private Long taskId;
    private Long sourceMarketId;
    private String templateCode;
    private String templateName;
    private String sceneCode;
    private String descriptionText;
    private Long currentTemplateVersionId;
    private Integer latestVersionNo;
    private String status;
}
