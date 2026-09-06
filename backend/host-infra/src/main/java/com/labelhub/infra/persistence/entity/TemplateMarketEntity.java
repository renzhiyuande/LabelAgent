package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("template_market")
public class TemplateMarketEntity extends AbstractEntity {
    private String templateCode;
    private String templateName;
    private String templateDescription;
    private String categoryCode;
    private String sceneCode;
    private Long coverImageFileId;
    private Long authorId;
    private Long sourceTenantId;
    private Long sourceTaskId;
    private Long templateVersionId;
    private String schemaJson;
    private String reviewPromptTemplate;
    private String reviewOutputSchemaJson;
    private String reviewWorkflowJson;
    private String acceptanceRuleJson;
    private String llmAssistConfigJson;
    private String tagsJson;
    private Integer downloadCount;
    private Integer likeCount;
    private Integer viewCount;
    private Integer favoriteCount;
    private BigDecimal ratingAvg;
    private Integer ratingCount;
    private Integer isPublic;
    private Integer isFeatured;
    private String auditStatus;
    private String status;
    private Instant publishedAt;
}
