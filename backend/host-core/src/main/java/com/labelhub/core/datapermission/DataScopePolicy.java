package com.labelhub.core.datapermission;

public record DataScopePolicy(
        Long id,
        String policyCode,
        String policyName,
        DataResourceType resourceType,
        DataScopeType scopeType,
        String scopeValueJson,
        String status,
        String remark) {
}
