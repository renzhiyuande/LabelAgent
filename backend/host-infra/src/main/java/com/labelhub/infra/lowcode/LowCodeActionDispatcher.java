package com.labelhub.infra.lowcode;

import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class LowCodeActionDispatcher {
    private final LowCodeProviderRegistry registry;

    public LowCodeActionDispatcher(LowCodeProviderRegistry registry) {
        this.registry = registry;
    }

    public void run(String resource, Long id, String action) {
        LowCodeResourceAction resourceAction = registry.resource(resource).actions().get(action);
        if (resourceAction == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "unsupported action");
        }
        resourceAction.run(id);
    }

    public void runBatch(String resource, String action, List<Long> ids) {
        LowCodeBulkResourceAction resourceAction = registry.resource(resource).bulkActions().get(action);
        if (resourceAction == null) {
            throw new BusinessException(ErrorCode.INVALID_OPERATION, "unsupported bulk action");
        }
        resourceAction.run(ids);
    }
}
