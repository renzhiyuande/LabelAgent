import type { NotificationType } from "../api/notifications-api";

const TYPE_LABEL: Record<NotificationType, string> = {
  MENTION: "提及",
  REVIEW: "审核",
  ALERT: "告警",
  SYSTEM: "系统",
};

export function notificationTypeLabel(type: NotificationType): string {
  return TYPE_LABEL[type] ?? type;
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 60_000) {
    return "刚刚";
  }
  if (diffMs < 3_600_000) {
    return `${Math.floor(diffMs / 60_000)} 分钟前`;
  }
  if (diffMs < 86_400_000) {
    return `${Math.floor(diffMs / 3_600_000)} 小时前`;
  }
  return date.toLocaleString();
}
