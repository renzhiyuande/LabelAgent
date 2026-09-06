package com.labelhub.infra.persistence.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString(callSuper = true)
@TableName("ai_review_dimension_scores")
public class AiReviewDimensionScoreEntity extends AbstractEntity {
    private Long aiReviewId;
    private String dimensionKey;
    private String dimensionName;
    private BigDecimal score;
    private BigDecimal weight;
    private String verdict;
    private String commentText;
    private Integer sortNo;
}
