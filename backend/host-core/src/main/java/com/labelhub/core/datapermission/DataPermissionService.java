package com.labelhub.core.datapermission;

import java.util.List;
import java.util.Set;

public interface DataPermissionService {
    Set<DataResourceType> listGrantedResourceTypes(Set<String> roleCodes);

    ResolvedDataScope resolve(Set<String> roleCodes, DataResourceType resourceType);

    default List<DataScopePolicy> listPolicies(Set<String> roleCodes, DataResourceType resourceType) {
        return resolve(roleCodes, resourceType).policies();
    }
}
