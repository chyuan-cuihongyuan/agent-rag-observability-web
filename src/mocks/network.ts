/**
 * AUTOLOOP al-19 / 工单 1019：声明式网络 mock 路由层（借鉴 mswjs/msw 的 handler API 形态）。
 *
 * 背景：next/jest 的模块分辨器不读 package exports，msw（任何现代版本）的
 * msw/node 及其传递依赖子路径均无法解析（工单 1019 实施记录）。故以 ~40 行
 * 薄路由层复刻 msw 的声明式语义：routes 为 [method, pathPattern, responder]，
 * use() 注入覆写（后进先出），未匹配严格报错防静默漏 mock。
 */

export type Responder = (req: { url: URL; body: unknown }) => {
  status?: number;
  code?: string;
  info?: string;
  data: unknown;
};

export type MockRoute = { method: string; path: string; responder: Responder };

export function route(method: string, path: string, responder: Responder): MockRoute {
  return { method: method.toUpperCase(), path, responder };
}

/** 安装 mock 网络：替换 global.fetch；返回 restore 与 use（覆写注入） */
export function installNetworkMock(routes: MockRoute[]) {
  const overrides: MockRoute[] = [];
  const realFetch = global.fetch;

  const match = (method: string, pathname: string): MockRoute | undefined => {
    for (const r of [...overrides].reverse().concat(routes)) {
      if (r.method === method.toUpperCase() && r.path === pathname) return r;
    }
    return undefined;
  };

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    // 相对路径需 base（jsdom 的 URL 构造器拒绝无 base 的相对串）
    const raw = typeof input === "string" ? input : (input as URL).toString();
    const url = new URL(raw, "http://mock.local");
    const method = (init?.method || "GET").toUpperCase();
    const found = match(method, url.pathname);
    if (!found) {
      throw new Error(`[mock-network] 未声明的请求: ${method} ${url.pathname}`);
    }
    let body: unknown = undefined;
    try {
      body = init?.body ? JSON.parse(String(init.body)) : undefined;
    } catch {
      body = undefined;
    }
    const res = found.responder({ url, body });
    const status = res.status ?? 200;
    // jsdom 无原生 Response：返回 api.ts 消费的最小响应面（ok/status/text/json）
    const payload = JSON.stringify({
      code: res.code ?? "0000",
      info: res.info ?? "success",
      data: res.data,
    });
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: "OK",
      text: async () => payload,
      json: async () => JSON.parse(payload),
    } as unknown as Response;
  }) as typeof fetch;

  return {
    restore: () => {
      global.fetch = realFetch;
    },
    /** 覆写注入（同 msw server.use 语义：后注册先生效） */
    use: (r: MockRoute) => overrides.push(r),
    reset: () => {
      overrides.length = 0;
    },
  };
}
