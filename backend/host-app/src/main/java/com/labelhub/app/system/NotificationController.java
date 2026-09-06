package com.labelhub.app.system;

import com.labelhub.core.api.ApiResponse;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.auth.AuthenticatedUser;
import com.labelhub.core.auth.CurrentUserProvider;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.notification.NotificationDtos.DispatchMentionsRequest;
import com.labelhub.core.notification.NotificationDtos.DispatchMentionsResult;
import com.labelhub.core.notification.NotificationDtos.NotificationSummary;
import com.labelhub.core.notification.NotificationDtos.RecentNotificationsResult;
import com.labelhub.core.notification.NotificationDtos.UnreadCountResult;
import com.labelhub.core.notification.NotificationService;
import com.labelhub.core.util.TraceContext;
import com.labelhub.core.util.PagingConstants;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class NotificationController {
    private final NotificationService notificationService;
    private final CurrentUserProvider currentUserProvider;

    public NotificationController(
            NotificationService notificationService,
            CurrentUserProvider currentUserProvider) {
        this.notificationService = notificationService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping("/recent")
    public ApiResponse<RecentNotificationsResult> recent(
            @RequestParam(defaultValue = "5") int limit) {
        Long userId = requireUserId();
        return ApiResponse.success(notificationService.recent(userId, limit), TraceContext.currentTraceId());
    }

    @GetMapping("/unread-count")
    public ApiResponse<UnreadCountResult> unreadCount() {
        Long userId = requireUserId();
        return ApiResponse.success(notificationService.unreadCount(userId), TraceContext.currentTraceId());
    }

    @GetMapping
    public ApiResponse<PageResponse<NotificationSummary>> list(
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = "" + PagingConstants.DEFAULT_PAGE_SIZE) int pageSize,
            @RequestParam(required = false) Boolean read) {
        Long userId = requireUserId();
        return ApiResponse.success(
                notificationService.list(userId, page, pageSize, read),
                TraceContext.currentTraceId());
    }

    @PostMapping("/{id}/read")
    public ApiResponse<Void> markRead(@PathVariable Long id) {
        notificationService.markRead(requireUserId(), id);
        return ApiResponse.success(null, TraceContext.currentTraceId());
    }

    @PostMapping("/read-all")
    public ApiResponse<Void> markAllRead() {
        notificationService.markAllRead(requireUserId());
        return ApiResponse.success(null, TraceContext.currentTraceId());
    }

    @PostMapping("/mentions")
    public ApiResponse<DispatchMentionsResult> dispatchMentions(@RequestBody DispatchMentionsRequest request) {
        AuthenticatedUser user = requireUser();
        return ApiResponse.success(
                notificationService.dispatchMentions(user.userId(), request),
                TraceContext.currentTraceId());
    }

    private AuthenticatedUser requireUser() {
        AuthenticatedUser user = currentUserProvider.currentUser();
        if (user == null || user.userId() == null) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
        return user;
    }

    private Long requireUserId() {
        return requireUser().userId();
    }
}
