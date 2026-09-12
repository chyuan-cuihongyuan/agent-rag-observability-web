/**
 * AUTOLOOP al-19 / 工单 1019：声明式网络 mock 用例（借鉴 mswjs/msw，
 * 因 next/jest 分辨器不兼容 msw exports 改用自研薄路由层，语义对齐）。
 */

import { installNetworkMock, route } from "@/mocks/network";
import { apiRoutes, traceListItem } from "@/mocks/handlers";

import { dashboardApi, queryApi, evalApi } from "@/lib/api";

const net = installNetworkMock(apiRoutes);

afterEach(() => net.reset());
afterAll(() => net.restore());

describe("声明式 handler + Zod 边界校验闭环", () => {
  it("overview happy path 经 schema 校验返回", async () => {
    const data = await dashboardApi.overview();
    expect(data.totalRequests).toBe(100);
    expect(data.successRate).toBeCloseTo(0.98);
  });

  it("traceList POST 分页结构经 schema 校验", async () => {
    const data = await queryApi.traceList({ page: 1, size: 20 });
    expect(data.total).toBe(1);
    expect(data.list[0].traceId).toBe("t-mock-1");
  });

  it("trend 与 qualityOverview 端点可用", async () => {
    const trend = await dashboardApi.trend();
    expect(trend).toHaveLength(1);
    const quality = await evalApi.qualityOverview();
    expect(quality.taskCount).toBe(3);
  });

  it("损坏注入：totalRequests 为字符串 → ESCHEMA", async () => {
    net.use(
      route("GET", "/api/v1/dashboard/overview", () => ({ data: { totalRequests: "corrupted" } }))
    );
    await expect(dashboardApi.overview()).rejects.toThrow(/响应结构校验失败/);
  });

  it("信封错误码优先于 schema 校验", async () => {
    net.use(
      route("GET", "/api/v1/dashboard/overview", () => ({
        code: "E001",
        info: "业务错误",
        data: null,
      }))
    );
    await expect(dashboardApi.overview()).rejects.toThrow("业务错误");
  });

  it("覆写注入多页数据（use 后进先出）", async () => {
    net.use(
      route("POST", "/api/v1/query/trace/list", () => ({
        data: {
          list: [traceListItem({ traceId: "t-a" }), traceListItem({ traceId: "t-b" })],
          total: 2,
          page: 1,
          size: 20,
        },
      }))
    );
    const data = await queryApi.traceList({});
    expect(data.list.map((t) => t.traceId)).toEqual(["t-a", "t-b"]);
  });

  it("未声明的请求严格报错（防静默漏 mock）", async () => {
    await expect(dashboardApi.branchDistribution()).rejects.toThrow(/未声明的请求/);
  });
});
