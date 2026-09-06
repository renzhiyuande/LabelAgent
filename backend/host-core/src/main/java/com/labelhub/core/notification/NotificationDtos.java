package com.labelhub.core.notification;

import java.time.Instant;
import java.util.List;

public final class NotificationDtos {
    private NotificationDtos() {}

    public enum NotificationType {
        MENTION,
        REVIEW,
        ALERT,
        SYSTEM
    }

    public record NotificationCommand(
            Long recipientUserId,
            NotificationType type,
            String title,
            String body,
            String linkUrl,
            String bizType,
            Long bizId,
            Long senderUserId) {}

    public record NotificationSummary(
            Long id,
            String type,
            String title,
            String body,
            String linkUrl,
            boolean read,
            Long senderUserId,
            String senderDisplayName,
            Instant createdAt) {}

    public record UnreadCountResult(long count) {}

    public record RecentNotificationsResult(List<NotificationSummary> items, long unreadCount) {}

    public record DispatchMentionsRequest(
            String text,
            String title,
            String body,
            String linkUrl,
            String bizType,
            Long bizId) {}

    public record DispatchMentionsResult(int recipientCount) {}
}
