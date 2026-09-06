package com.labelhub.core.datapermission;

import java.util.List;

public record ResolvedDataScope(DataResourceType resourceType, List<DataScopePolicy> policies) {
}
