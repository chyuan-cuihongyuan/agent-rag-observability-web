/**
 * 通知中心 API 封装（工单 0299 AL7 + 0300 AL8）
 *
 * 端点清单显式导出（NOTIFICATION_BASELINE），供契约断言与后端基线比对；
 * 请求复用 lib/api.ts 统一客户端（经 Next.js 代理到观测后端）。
 */

import { request } from "@/lib/api";

/** 通知实体（与后端 Notification 同构） */
export interface NotificationItem {
  id: string;
  eventType: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | string;
  title: string;
  status: string;
  createdAtMs: number;
}

/** 后端通知端点基线（AL8 契约断言用） */
export const NOTIFICATION_BASELINE: readonly string[] = [
  "GET /api/v1/notifications",
  "GET /api/v1/notifications/unread-count",
  "POST /api/v1/notifications/{id}/read",
  "POST /api/v1/notifications/read-all",
  "POST /api/v1/notifications/events",
  "POST /api/v1/notifications/subscriptions",
  "POST /api/v1/notifications/digest-preview",
  "POST /api/v1/notifications/render-preview",
];

/** 通知列表（订阅者隔离 + 分页封顶） */
export async function listNotifications(subscriber: string, status?: string): Promise<NotificationItem[]> {
  const query = new URLSearchParams({ subscriber });
  if (status) {
    query.set("status", status);
  }
  return request<NotificationItem[]>(`/api/v1/notifications?${query.toString()}`);
}

/** 未读计数 */
export async function unreadCount(subscriber: string): Promise<{ unread: number }> {
  return request<{ unread: number }>(
    `/api/v1/notifications/unread-count?subscriber=${encodeURIComponent(subscriber)}`
  );
}

/** 单条已读（幂等） */
export async function markRead(id: string, subscriber: string): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read?subscriber=${encodeURIComponent(subscriber)}`,
    { method: "POST" }
  );
}

/** 全部已读 */
export async function markAllRead(subscriber: string): Promise<{ read: number }> {
  return request<{ read: number }>(
    `/api/v1/notifications/read-all?subscriber=${encodeURIComponent(subscriber)}`,
    { method: "POST" }
  );
}
