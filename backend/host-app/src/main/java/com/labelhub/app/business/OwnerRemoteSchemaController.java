package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.lowcode.RemoteSchemaQueryService;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/owner/remote-schemas")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class OwnerRemoteSchemaController {
    private final RemoteSchemaQueryService remoteSchemaQueryService;

    public OwnerRemoteSchemaController(RemoteSchemaQueryService remoteSchemaQueryService) {
        this.remoteSchemaQueryService = remoteSchemaQueryService;
    }

    @GetMapping("/{namespace}/{key}/form-schema")
    @RequireAnyPermission({
            "system:admin",
            "business:task:read",
            "business:task:create",
            "business:task:update",
            "business:reward:manage"
    })
    public ApiResponse<Map<String, Object>> getFormSchema(@PathVariable String namespace, @PathVariable String key) {
        return ok(remoteSchemaQueryService.getFormSchema(namespace, key));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
