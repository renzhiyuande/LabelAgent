package com.labelhub.app.business;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.authz.RequireAnyPermission;
import com.labelhub.core.business.BusinessDtos.CollaboratorProfile;
import com.labelhub.core.business.CollaboratorRole;
import com.labelhub.core.business.UserVisibilityService;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.util.TraceContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/business/collaborators")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class CollaboratorController {
    private final UserVisibilityService userVisibilityService;
    private final CurrentUserProvider currentUserProvider;

    public CollaboratorController(
            UserVisibilityService userVisibilityService,
            CurrentUserProvider currentUserProvider) {
        this.userVisibilityService = userVisibilityService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/{userId}")
    @RequireAnyPermission({
        "business:task:read",
        "business:task:update",
        "business:labeler:workbench",
        "business:reviewer:workbench",
        "business:assignment:read",
        "system:admin"
    })
    public ApiResponse<CollaboratorProfile> profile(
            @PathVariable Long userId,
            @RequestParam(required = false) String role) {
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (user == null || user.userId() == null) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        CollaboratorRole targetRole = CollaboratorRole.parse(role).orElse(null);
        CollaboratorProfile profile = userVisibilityService
                .findVisibleCollaborator(user.userId(), user.roles(), userId, targetRole)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return ApiResponse.success(profile, TraceContext.currentTraceId());
    }
}
