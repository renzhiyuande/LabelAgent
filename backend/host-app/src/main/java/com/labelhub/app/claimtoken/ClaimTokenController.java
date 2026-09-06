package com.labelhub.app.claimtoken;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.claimtoken.ClaimTokenIssueResult;
import com.labelhub.core.claimtoken.ClaimTokenRedemptionResult;
import com.labelhub.core.claimtoken.ClaimTokenService;
import com.labelhub.core.util.TraceContext;
import com.labelhub.infra.system.CurrentUserContext;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 通用抢单凭证 API：与具体业务解耦，通过 scene + Handler 扩展。
 */
@RestController
@RequestMapping("/api/v1/claim-tokens")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class ClaimTokenController {
    private final ClaimTokenService claimTokenService;
    private final CurrentUserContext currentUserContext;

    public ClaimTokenController(ClaimTokenService claimTokenService, CurrentUserContext currentUserContext) {
        this.claimTokenService = claimTokenService;
        this.currentUserContext = currentUserContext;
    }

    /** 签发一次性抢单凭证；labeler.market 场景会预占 Redis 库存 */
    @PostMapping
    public ApiResponse<ClaimTokenIssueResult> issue(@Valid @RequestBody ClaimTokenDtos.ClaimTokenIssueRequest request) {
        return ok(claimTokenService.issue(request.scene(), currentUserContext.requireUserId(), request.payload()));
    }

    /** 使用凭证兑换抢单结果；凭证原子消费，不可重复使用 */
    @PostMapping("/{token}/redeem")
    public ApiResponse<ClaimTokenRedemptionResult> redeem(@PathVariable String token) {
        return ok(claimTokenService.redeem(token, currentUserContext.requireUserId()));
    }

    private <T> ApiResponse<T> ok(T data) {
        return ApiResponse.success(data, TraceContext.currentTraceId());
    }
}
