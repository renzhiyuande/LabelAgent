package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.reward.RewardRuleSchemas;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.lowcode.RemoteSchemaQueryService;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 标注员只读远程 schema；与 owner 分离，避免标注员调用 /api/v1/owner/**。
 */
@RestController
@RequestMapping("/api/v1/labeler/remote-schemas")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class LabelerRemoteSchemaController {
    private final RemoteSchemaQueryService remoteSchemaQueryService;

    public LabelerRemoteSchemaController(RemoteSchemaQueryService remoteSchemaQueryService) {
        this.remoteSchemaQueryService = remoteSchemaQueryService;
    }

    @GetMapping("/{namespace}/{key}/form-schema")
    @RequireAnyPermission({ "business:labeler:workbench" })
    public ApiResponse<Map<String, Object>> getFormSchema(@PathVariable String namespace, @PathVariable String key) {
        if (!RewardRuleSchemas.NAMESPACE.equals(namespace)) {
            throw new BusinessException(ErrorCode.AUTH_FORBIDDEN, "无权访问该 schema");
        }
        return ok(remoteSchemaQueryService.getFormSchema(namespace, key));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
