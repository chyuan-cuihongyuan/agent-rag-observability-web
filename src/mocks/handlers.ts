/**
 * AUTOLOOP al-19 / 工单 1019：声明式 handler 资产（借鉴 mswjs/msw）。
 * 与 al-04 schema 化端点同集（overview/trend/traceList/qualityOverview），
 * 形成校验+mock 闭环。
 */

import { route, type MockRoute } from "@/mocks/network";

const API = "/api/v1";

/** 单条 Trace 列表项（12 必填字段，可覆盖） */
export function traceListItem(overrides: Record<string, unknown> = {}) {
  return {
    traceId: "t-mock-1",
    sessionId: "s-1",
    ownerUserId: "u-1",
    sourceService: "svc",
    agentId: "a-1",
    userQuery: "q",
    intentType: "i",
    branchType: "b",
    agentStatus: "ok",
    costTimeMs: 12,
    modelVersion: "m",
    createTime: "2026-09-13T00:00:00Z",
    ...overrides,
  };
}

/** 标准四端点路由（happy path） */
export const apiRoutes: MockRoute[] = [
  route("GET", `${API}/dashboard/overview`, () => ({
    data: {
      totalRequests: 100,
      successRate: 0.98,
      avgCostTimeMs: 123.4,
      emptyRetrievalRate: 0.01,
      failRate: 0.02,
    },
  })),

  route("GET", `${API}/dashboard/trend`, () => ({
    data: [{ time_bucket: "2026-09-13T00", request_count: 5, fail_count: 0, avg_cost_ms: 10 }],
  })),

  route("POST", `${API}/query/trace/list`, () => ({
    data: { list: [traceListItem()], total: 1, page: 1, size: 20 },
  })),

  route("GET", `${API}/eval/quality_overview`, () => ({
    data: {
      avgOverallScore: 0.87,
      taskCount: 3,
      sampleCount: 54,
      updateTime: "2026-09-13T00:00:00Z",
    },
  })),
];
