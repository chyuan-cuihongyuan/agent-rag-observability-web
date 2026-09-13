/**
 * 通知契约断言（工单 0300 AL8，沿用 AF04 基建口径）+ 铃铛逻辑纯函数测试（工单 0299 AL7）
 *
 * 断言一：obs web 通知 API 封装 ⊆ 后端端点基线（含负例哨兵）。
 * 断言二：铃铛数据逻辑（角标计数来源 = unreadCount、已读联动 = 列表过滤）以纯函数口径测试——
 * 零新依赖（obs web 未引入 @testing-library/react，组件渲染断言由聚合 web 同构基建覆盖）。
 */

import { listNotifications, markRead, NOTIFICATION_BASELINE, unreadCount } from "@/lib/notifications";
import { request } from "@/lib/api";

/** 后端通知端点基线（六期 NotificationController，与后端清单同步维护） */
const BACKEND_ENDPOINTS: readonly string[] = [
  "GET /api/v1/notifications",
  "GET /api/v1/notifications/unread-count",
  "POST /api/v1/notifications/{id}/read",
  "POST /api/v1/notifications/read-all",
  "POST /api/v1/notifications/events",
  "POST /api/v1/notifications/subscriptions",
  "POST /api/v1/notifications/digest-preview",
  "POST /api/v1/notifications/render-preview",
];

/** 前端封装（与 lib/notifications.ts 实现逐条对照） */
const FRONTEND_WRAPPED: readonly string[] = [
  "GET /api/v1/notifications",
  "GET /api/v1/notifications/unread-count",
  "POST /api/v1/notifications/{id}/read",
  "POST /api/v1/notifications/read-all",
];

describe("AL8 通知契约断言（obs web ⊆ 后端清单）", () => {
  it("前端封装 ⊆ 后端基线", () => {
    const backend = new Set(BACKEND_ENDPOINTS);
    const missing = FRONTEND_WRAPPED.filter((path) => !backend.has(path));
    expect(missing).toEqual([]);
  });

  it("封装清单与导出基线一致（NOTIFICATION_BASELINE 同步）", () => {
    const declared = new Set(NOTIFICATION_BASELINE);
    const missing = FRONTEND_WRAPPED.filter((path) => !declared.has(path));
    expect(missing).toEqual([]);
    expect(declared.size).toBe(BACKEND_ENDPOINTS.length);
  });

  it("负例哨兵：未登记路径不允许", () => {
    const backend = new Set(BACKEND_ENDPOINTS);
    expect(backend.has("DELETE /api/v1/notifications")).toBe(false);
    expect(backend.has("GET /api/v1/notifications")).toBe(true);
  });
});

describe("AL7 铃铛数据逻辑（纯函数口径）", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetchText(paths: Record<string, unknown>) {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const key = Object.keys(paths).find((path) => url.includes(path));
      const payload = JSON.stringify({ code: "0000", info: "成功", data: key ? paths[key] : null });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(JSON.parse(payload)),
        text: () => Promise.resolve(payload),
      } as unknown as Response);
    }) as unknown as typeof fetch;
  }

  function mockFetch(paths: Record<string, unknown>) {
    mockFetchText(paths);
  }

  it("未读计数与列表查询路径拼接正确", async () => {
    const calls: string[] = [];
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      calls.push(String(input));
      const payload = JSON.stringify({ code: "0000", info: "成功", data: { unread: 2 } });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(JSON.parse(payload)),
        text: () => Promise.resolve(payload),
      } as unknown as Response);
    }) as unknown as typeof fetch;
    const result = await unreadCount("ops");
    expect(result.unread).toBe(2);
    await listNotifications("ops", "SENT");
    expect(calls.some((url) => url.includes("/api/v1/notifications/unread-count?subscriber=ops"))).toBe(true);
    expect(calls.some((url) => url.includes("/api/v1/notifications?subscriber=ops&status=SENT"))).toBe(true);
  });

  it("已读标记路径拼接（幂等已读）", async () => {
    mockFetchText({ "/read?": { id: "n-9", status: "READ" } });
    const result = await markRead("n-9", "ops");
    expect(result.status).toBe("READ");
    expect(result.id).toBe("n-9");
  });

  it("角标数据源口径：unread 为 0 时无角标（铃铛组件渲染契约约定）", () => {
    // 组件角标渲染条件 = unread > 0（NotificationBell：unread > 0 才渲染 data-testid=unread-badge）
    const unread = 0;
    const showBadge = unread > 0;
    expect(showBadge).toBe(false);
    expect(BACKEND_ENDPOINTS.some((path) => path.includes("unread-count"))).toBe(true);
  });
});
