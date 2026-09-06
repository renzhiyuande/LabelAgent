package com.labelhub.core.notification;

import com.labelhub.core.api.PageResponse;
import com.labelhub.core.notification.NotificationDtos.DispatchMentionsRequest;
import com.labelhub.core.notification.NotificationDtos.DispatchMentionsResult;
import com.labelhub.core.notification.NotificationDtos.NotificationCommand;
import com.labelhub.core.notification.NotificationDtos.NotificationSummary;
import com.labelhub.core.notification.NotificationDtos.RecentNotificationsResult;
import com.labelhub.core.notification.NotificationDtos.UnreadCountResult;
import java.util.List;

public interface NotificationService {
    void send(NotificationCommand command);

    void sendAll(List<NotificationCommand> commands);

    UnreadCountResult unreadCount(Long recipientUserId);

    RecentNotificationsResult recent(Long recipientUserId, int limit);

    PageResponse<NotificationSummary> list(Long recipientUserId, int page, int pageSize, Boolean read);

    void markRead(Long recipientUserId, Long notificationId);

    void markAllRead(Long recipientUserId);

    DispatchMentionsResult dispatchMentions(Long senderUserId, DispatchMentionsRequest request);
}
