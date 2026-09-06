package com.labelhub.infra.datapermission;

import com.labelhub.core.datapermission.DataResourceType;
import com.labelhub.core.datapermission.DataScopePolicy;
import java.util.List;
import java.util.Set;

public record DataPermissionRule(
        DataResourceType resourceType,
        Set<String> roleCodes,
        List<DataScopePolicy> policies,
        List<SqlPredicate> predicates) {
}
