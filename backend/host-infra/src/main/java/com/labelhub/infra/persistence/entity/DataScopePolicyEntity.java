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
@TableName("data_scope_policies")
public class DataScopePolicyEntity extends AbstractEntity {
    private String policyCode;
    private String policyName;
    private String resourceType;
    private String scopeType;
    private String scopeValueJson;
    private String status;
    private String remark;
}
