"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "./api/notifications-api";
import { formatNotificationTime, notificationTypeLabel } from "./utils/notification-meta";

type ReadFilter = "all" | "unread" | "read";

export function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ReadFilter>("all");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchNotifications({
        page,
        pageSize,
        read: filter === "all" ? undefined : filter === "read",
      });
      setItems(result.list ?? []);
      setTotal(result.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  async function openItem(item: NotificationItem) {
    if (!item.read) {
      await markNotificationRead(item.id);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
    }
    if (item.linkUrl) {
      navigate(item.linkUrl);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">通知中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            @提及、审核结果与系统告警将在此展示。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void markAllNotificationsRead().then(loadPage)}>
          全部标为已读
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "unread", "read"] as ReadFilter[]).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
          >
            {value === "all" ? "全部" : value === "unread" ? "未读" : "已读"}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">加载中…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">暂无通知</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col gap-1 px-4 py-4 text-left transition hover:bg-muted",
                    !item.read && "bg-primary/5",
                  )}
                  onClick={() => void openItem(item)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{notificationTypeLabel(item.type)}</span>
                  </div>
                  {item.body ? <p className="text-sm text-muted-foreground">{item.body}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {formatNotificationTime(item.createdAt)}
                    {item.senderDisplayName ? ` · ${item.senderDisplayName}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  );
}
