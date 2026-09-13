"use client";

/**
 * 通知铃铛（工单 0299 AL7）：未读角标 + 最近通知下拉 + 点击已读联动，零新依赖。
 */

import { useCallback, useEffect, useState } from "react";

import { listNotifications, markRead, unreadCount } from "@/lib/notifications";
import type { NotificationItem } from "@/lib/notifications";

interface NotificationBellProps {
  /** 订阅者（当前用户标识） */
  subscriber: string;
  /** 轮询间隔毫秒（0=不轮询，测试用） */
  pollMs?: number;
}

const SEVERITY_DOT: Record<string, string> = {
  INFO: "bg-sky-500",
  WARNING: "bg-amber-500",
  CRITICAL: "bg-red-500",
};

export default function NotificationBell({ subscriber, pollMs = 0 }: NotificationBellProps) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const count = await unreadCount(subscriber);
      setUnread(count.unread);
      if (open) {
        setItems(await listNotifications(subscriber));
      }
    } catch {
      // 后端不可用静默（角标保持上次值）
    }
  }, [subscriber, open]);

  useEffect(() => {
    void refresh();
    if (pollMs <= 0) {
      return undefined;
    }
    const timer = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(timer);
  }, [refresh, pollMs]);

  const handleRead = useCallback(
    async (id: string) => {
      await markRead(id, subscriber);
      setItems((current) => current.filter((item) => item.id !== id));
      const count = await unreadCount(subscriber);
      setUnread(count.unread);
    },
    [subscriber]
  );

  return (
    <div className="relative" data-testid="notification-bell">
      <button
        aria-label="通知"
        className="relative rounded p-2 text-slate-600 hover:bg-slate-100"
        onClick={() => {
          setOpen((value) => !value);
          void refresh();
        }}
      >
        🔔
        {unread > 0 ? (
          <span
            className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white"
            data-testid="unread-badge"
          >
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute right-0 z-10 mt-1 w-80 rounded border border-slate-200 bg-white p-2 shadow"
          data-testid="bell-dropdown"
        >
          {items.length === 0 ? (
            <div className="p-2 text-sm text-slate-400" data-testid="bell-empty">
              暂无未读通知
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                <span className={`h-2 w-2 rounded-full ${SEVERITY_DOT[item.severity] ?? "bg-slate-400"}`} />
                <span className="flex-1 truncate">{item.title}</span>
                <button
                  className="text-xs text-sky-600"
                  onClick={() => void handleRead(item.id)}
                >
                  已读
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
