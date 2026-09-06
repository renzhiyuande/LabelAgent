"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { appMessage } from "@/lib/message";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  fetchRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../api/notifications-api";
import { formatNotificationTime, notificationTypeLabel } from "../utils/notification-meta";
import { shouldAutoToastNotification } from "../utils/notification-auto-toast";

export function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const loadRecent = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const result = await fetchRecentNotifications(5);
      const nextItems = result.items ?? [];
      const nextUnreadCount = result.unreadCount ?? 0;

      if (initializedRef.current) {
        for (const item of nextItems) {
          if (item.read || seenNotificationIdsRef.current.has(item.id)) {
            continue;
          }
          seenNotificationIdsRef.current.add(item.id);
          if (!shouldAutoToastNotification(item, location.pathname)) {
            continue;
          }
          if (item.type === "ALERT") {
            appMessage.success(item.title, item.body ?? undefined);
          } else {
            appMessage.info(item.title, item.body ?? undefined);
          }
        }
      } else {
        for (const item of nextItems) {
          seenNotificationIdsRef.current.add(item.id);
        }
        initializedRef.current = true;
      }

      setItems(nextItems);
      setUnreadCount(nextUnreadCount);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    void loadRecent();
    const timer = window.setInterval(() => void loadRecent({ silent: true }), 15_000);
    return () => window.clearInterval(timer);
  }, [loadRecent]);

  useEffect(() => {
    if (open) {
      void loadRecent();
    }
  }, [open, loadRecent]);

  async function handleOpenItem(item: NotificationItem) {
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
        setUnreadCount((count) => Math.max(0, count - 1));
        setItems((current) =>
          current.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
        );
      } catch {
        // ignore
      }
    }
    setOpen(false);
    if (item.linkUrl) {
      navigate(item.linkUrl);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((current) => current.map((row) => ({ ...row, read: true })));
    } catch {
      // ignore
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="通知">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">通知</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} 条未读` : "暂无未读"}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void handleMarkAllRead()}>
              全部已读
            </Button>
          ) : null}
        </div>

        <div className="max-h-[320px] overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">加载中…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">暂无通知</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-muted",
                      !item.read && "bg-primary/5",
                    )}
                    onClick={() => void handleOpenItem(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {notificationTypeLabel(item.type)}
                      </span>
                    </div>
                    {item.body ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">
                      {formatNotificationTime(item.createdAt)}
                      {item.senderDisplayName ? ` · ${item.senderDisplayName}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full text-sm"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            查看全部
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
