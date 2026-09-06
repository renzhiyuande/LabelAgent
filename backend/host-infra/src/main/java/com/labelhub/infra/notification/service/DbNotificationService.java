package com.labelhub.infra.notification.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.labelhub.core.api.PageResponse;
import com.labelhub.core.error.BusinessException;
import com.labelhub.core.error.ErrorCode;
import com.labelhub.core.notification.NotificationDtos.DispatchMentionsRequest;
import com.labelhub.core.notification.NotificationDtos.DispatchMentionsResult;
import com.labelhub.core.notification.NotificationDtos.NotificationCommand;
import com.labelhub.core.notification.NotificationDtos.NotificationSummary;
import com.labelhub.core.notification.NotificationDtos.NotificationType;
import com.labelhub.core.notification.NotificationDtos.RecentNotificationsResult;
import com.labelhub.core.notification.NotificationDtos.UnreadCountResult;
import com.labelhub.core.notification.NotificationService;
import com.labelhub.infra.notification.support.MentionTextSupport;
import com.labelhub.infra.persistence.entity.UserEntity;
import com.labelhub.infra.persistence.entity.UserNotificationEntity;
import com.labelhub.infra.persistence.mapper.UserMapper;
import com.labelhub.infra.persistence.mapper.UserNotificationMapper;
import com.labelhub.infra.system.UserDisplayNameResolver;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@ConditionalOnProperty(name = "labelhub.auth.mode", havingValue = "db", matchIfMissing = true)
public class DbNotificationService implements NotificationService {
    private final UserNotificationMapper notificationMapper;
    private final UserMapper userMapper;
    private final UserDisplayNameResolver displayNameResolver;

    public DbNotificationService(
            UserNotificationMapper notificationMapper,
            UserMapper userMapper,
            UserDisplayNameResolver displayNameResolver) {
        this.notificationMapper = notificationMapper;
        this.userMapper = userMapper;
        this.displayNameResolver = displayNameResolver;
    }

    @Override
    @Transactional
    public void send(NotificationCommand command) {
        if (command == null || command.recipientUserId() == null) {
            return;
        }
        if (!StringUtils.hasText(command.title())) {
            return;
        }
        UserNotificationEntity entity = new UserNotificationEntity();
        entity.setRecipientUserId(command.recipientUserId());
        entity.setNotificationType(command.type().name());
        entity.setTitle(command.title().trim());
        entity.setBody(trimToNull(command.body()));
        entity.setLinkUrl(trimToNull(command.linkUrl()));
        entity.setBizType(trimToNull(command.bizType()));
        entity.setBizId(command.bizId());
        entity.setSenderUserId(command.senderUserId());
        entity.setReadFlag(0);
        entity.setCreatedBy(command.senderUserId());
        entity.setUpdatedBy(command.senderUserId());
        notificationMapper.insert(entity);
    }

    @Override
    @Transactional
    public void sendAll(List<NotificationCommand> commands) {
        if (commands == null || commands.isEmpty()) {
            return;
        }
        for (NotificationCommand command : commands) {
            send(command);
        }
    }

    @Override
    public UnreadCountResult unreadCount(Long recipientUserId) {
        requireRecipient(recipientUserId);
        LambdaQueryWrapper<UserNotificationEntity> wrapper = baseRecipientQuery(recipientUserId)
                .eq(UserNotificationEntity::getReadFlag, 0);
        Long count = notificationMapper.selectCount(wrapper);
        return new UnreadCountResult(count == null ? 0L : count);
    }

    @Override
    public RecentNotificationsResult recent(Long recipientUserId, int limit) {
        requireRecipient(recipientUserId);
        int safeLimit = Math.max(1, Math.min(limit, 20));
        LambdaQueryWrapper<UserNotificationEntity> wrapper = baseRecipientQuery(recipientUserId)
                .orderByDesc(UserNotificationEntity::getCreatedAt)
                .last("LIMIT " + safeLimit);
        List<UserNotificationEntity> rows = notificationMapper.selectList(wrapper);
        UnreadCountResult unread = unreadCount(recipientUserId);
        return new RecentNotificationsResult(toSummaries(rows), unread.count());
    }

    @Override
    public PageResponse<NotificationSummary> list(Long recipientUserId, int page, int pageSize, Boolean read) {
        requireRecipient(recipientUserId);
        int safePage = Math.max(1, page);
        int safePageSize = Math.max(1, Math.min(pageSize, 100));
        LambdaQueryWrapper<UserNotificationEntity> wrapper = baseRecipientQuery(recipientUserId);
        if (read != null) {
            wrapper.eq(UserNotificationEntity::getReadFlag, read ? 1 : 0);
        }
        wrapper.orderByDesc(UserNotificationEntity::getCreatedAt);
        Page<UserNotificationEntity> result = notificationMapper.selectPage(new Page<>(safePage, safePageSize), wrapper);
        return PageResponse.of(
                result.getTotal(),
                safePage,
                safePageSize,
                toSummaries(result.getRecords()));
    }

    @Override
    @Transactional
    public void markRead(Long recipientUserId, Long notificationId) {
        requireRecipient(recipientUserId);
        UserNotificationEntity existing = requireOwnedNotification(recipientUserId, notificationId);
        if (existing.getReadFlag() != null && existing.getReadFlag() == 1) {
            return;
        }
        existing.setReadFlag(1);
        existing.setReadAt(Instant.now());
        existing.setUpdatedAt(Instant.now());
        notificationMapper.updateById(existing);
    }

    @Override
    @Transactional
    public void markAllRead(Long recipientUserId) {
        requireRecipient(recipientUserId);
        LambdaUpdateWrapper<UserNotificationEntity> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(UserNotificationEntity::getRecipientUserId, recipientUserId)
                .eq(UserNotificationEntity::getDeletedFlag, 0)
                .eq(UserNotificationEntity::getReadFlag, 0)
                .set(UserNotificationEntity::getReadFlag, 1)
                .set(UserNotificationEntity::getReadAt, Instant.now())
                .set(UserNotificationEntity::getUpdatedAt, Instant.now());
        notificationMapper.update(null, wrapper);
    }

    @Override
    @Transactional
    public DispatchMentionsResult dispatchMentions(Long senderUserId, DispatchMentionsRequest request) {
        if (request == null || !StringUtils.hasText(request.text())) {
            return new DispatchMentionsResult(0);
        }
        List<String> labels = MentionTextSupport.extractMentionLabels(request.text());
        if (labels.isEmpty()) {
            return new DispatchMentionsResult(0);
        }
        Set<Long> recipientIds = new LinkedHashSet<>();
        for (String label : labels) {
            resolveUserIdByLabel(label).ifPresent(recipientIds::add);
        }
        if (senderUserId != null) {
            recipientIds.remove(senderUserId);
        }
        if (recipientIds.isEmpty()) {
            return new DispatchMentionsResult(0);
        }
        String senderName = displayNameResolver.resolve(senderUserId);
        String title = StringUtils.hasText(request.title())
                ? request.title().trim()
                : senderName + " 在内容中提到了你";
        String body = StringUtils.hasText(request.body()) ? request.body().trim() : request.text().trim();
        List<NotificationCommand> commands = new ArrayList<>();
        for (Long recipientId : recipientIds) {
            commands.add(new NotificationCommand(
                    recipientId,
                    NotificationType.MENTION,
                    title,
                    body,
                    trimToNull(request.linkUrl()),
                    trimToNull(request.bizType()),
                    request.bizId(),
                    senderUserId));
        }
        sendAll(commands);
        return new DispatchMentionsResult(commands.size());
    }

    public void notifyReviewOutcome(
            Long recipientUserId,
            Long senderUserId,
            String title,
            String body,
            String linkUrl,
            Long submissionId) {
        if (recipientUserId == null || Objects.equals(recipientUserId, senderUserId)) {
            return;
        }
        send(new NotificationCommand(
                recipientUserId,
                NotificationType.REVIEW,
                title,
                body,
                linkUrl,
                "SUBMISSION",
                submissionId,
                senderUserId));
    }

    public void notifyMentionsInText(
            Long senderUserId,
            String text,
            String title,
            String body,
            String linkUrl,
            String bizType,
            Long bizId) {
        dispatchMentions(senderUserId, new DispatchMentionsRequest(text, title, body, linkUrl, bizType, bizId));
    }

    private List<NotificationSummary> toSummaries(List<UserNotificationEntity> rows) {
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }
        List<NotificationSummary> summaries = new ArrayList<>(rows.size());
        for (UserNotificationEntity row : rows) {
            summaries.add(new NotificationSummary(
                    row.getId(),
                    row.getNotificationType(),
                    row.getTitle(),
                    row.getBody(),
                    row.getLinkUrl(),
                    row.getReadFlag() != null && row.getReadFlag() == 1,
                    row.getSenderUserId(),
                    displayNameResolver.resolve(row.getSenderUserId()),
                    row.getCreatedAt()));
        }
        return summaries;
    }

    private java.util.Optional<Long> resolveUserIdByLabel(String label) {
        LambdaQueryWrapper<UserEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserEntity::getDeletedFlag, 0)
                .and(w -> w.eq(UserEntity::getDisplayName, label).or().eq(UserEntity::getUsername, label))
                .last("LIMIT 1");
        UserEntity user = userMapper.selectOne(wrapper);
        return user == null ? java.util.Optional.empty() : java.util.Optional.ofNullable(user.getId());
    }

    private UserNotificationEntity requireOwnedNotification(Long recipientUserId, Long notificationId) {
        if (notificationId == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "notificationId is required");
        }
        LambdaQueryWrapper<UserNotificationEntity> wrapper = baseRecipientQuery(recipientUserId)
                .eq(UserNotificationEntity::getId, notificationId)
                .last("LIMIT 1");
        UserNotificationEntity entity = notificationMapper.selectOne(wrapper);
        if (entity == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        return entity;
    }

    private static LambdaQueryWrapper<UserNotificationEntity> baseRecipientQuery(Long recipientUserId) {
        return new LambdaQueryWrapper<UserNotificationEntity>()
                .eq(UserNotificationEntity::getRecipientUserId, recipientUserId)
                .eq(UserNotificationEntity::getDeletedFlag, 0);
    }

    private static void requireRecipient(Long recipientUserId) {
        if (recipientUserId == null) {
            throw new BusinessException(ErrorCode.AUTH_UNAUTHENTICATED);
        }
    }

    private static String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
