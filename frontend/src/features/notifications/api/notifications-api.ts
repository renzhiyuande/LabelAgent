import { request } from "@/utils/apiClient";

export type NotificationType = "MENTION" | "REVIEW" | "ALERT" | "SYSTEM";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  read: boolean;
  senderUserId?: string | null;
  senderDisplayName?: string | null;
  createdAt: string;
}

export interface RecentNotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export interface NotificationPageResponse {
  total: number;
  page: number;
  pageSize: number;
  list: NotificationItem[];
}

export async function fetchRecentNotifications(limit = 5): Promise<RecentNotificationsResponse> {
  return request<RecentNotificationsResponse>(`/api/v1/notifications/recent?limit=${limit}`);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const result = await request<{ count: number }>("/api/v1/notifications/unread-count");
  return result.count ?? 0;
}

export async function fetchNotifications(params: {
  page?: number;
  pageSize?: number;
  read?: boolean;
}): Promise<NotificationPageResponse> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 20));
  if (params.read !== undefined) {
    search.set("read", String(params.read));
  }
  return request<NotificationPageResponse>(`/api/v1/notifications?${search.toString()}`);
}

export async function markNotificationRead(id: string): Promise<void> {
  await request<void>(`/api/v1/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await request<void>("/api/v1/notifications/read-all", { method: "POST" });
}

export async function dispatchMentionNotifications(payload: {
  text: string;
  title?: string;
  body?: string;
  linkUrl?: string;
  bizType?: string;
  bizId?: string | number;
}): Promise<number> {
  const result = await request<{ recipientCount: number }>("/api/v1/notifications/mentions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result.recipientCount ?? 0;
}
