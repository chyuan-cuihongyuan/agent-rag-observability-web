/**
 * AUTOLOOP al-04 / 工单 1004：响应边界校验单元测试（借鉴 colinhacks/zod）
 *
 * 覆盖：合法载荷通过 / 可选字段缺失与多余字段放行 / 核心字段类型错拦截 /
 * ApiError(ESCHEMA) 带字段路径 / request seam 集成（fetch mock）。
 */

import { parseWithSchema, ApiError, dashboardApi, queryApi } from "@/lib/api";
import {
  overviewSchema,
  trendListSchema,
  traceListSchema,
  qualityOverviewSchema,
} from "@/lib/schemas";

describe("schemas 宽容式校验", () => {
  it("合法 overview 载荷通过且保留多余字段", () => {
    const data = {
      totalRequests: 100,
      successRate: 0.98,
      avgCostTimeMs: 123.4,
      emptyRetrievalRate: 0,
      failRate: 0.02,
      extraField: "drift-tolerated",
    };
    expect(parseWithSchema(data, overviewSchema)).toEqual(data);
  });

  it("可选字段缺失/null 放行（空库场景）", () => {
    expect(parseWithSchema({ totalRequests: null }, overviewSchema)).toEqual({
      totalRequests: null,
    });
    expect(parseWithSchema({}, overviewSchema)).toEqual({});
  });

  it("核心指标类型错抛 ApiError 且 code=ESCHEMA", () => {
    try {
      parseWithSchema({ totalRequests: "一百" }, overviewSchema);
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("ESCHEMA");
      expect((e as ApiError).message).toContain("totalRequests");
    }
  });

  it("trend 数组项 time_bucket 损坏时带路径索引", () => {
    try {
      parseWithSchema(
        [
          { time_bucket: "2026-09-13T00", request_count: 5, fail_count: 0, avg_cost_ms: 10 },
          { time_bucket: 42, request_count: 5, fail_count: 0, avg_cost_ms: 10 },
        ],
        trendListSchema
      );
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).message).toContain("1.time_bucket");
    }
  });

  it("分页结构：list 缺失即失败，total 为字符串即失败", () => {
    const item = {
      traceId: "t1", sessionId: "s1", ownerUserId: "u1", sourceService: "svc",
      agentId: "a1", userQuery: "q", intentType: "i", branchType: "b",
      agentStatus: "ok", costTimeMs: 1, modelVersion: "m", createTime: "c",
    };
    expect(() => parseWithSchema({ total: 1, page: 1, size: 1 }, traceListSchema)).toThrow(
      ApiError
    );
    expect(() =>
      parseWithSchema({ list: [item], total: "1", page: 1, size: 1 }, traceListSchema)
    ).toThrow(/total/);
    expect(
      parseWithSchema({ list: [item], total: 1, page: 1, size: 1 }, traceListSchema).list
    ).toHaveLength(1);
  });

  it("qualityOverview 仅要求 taskCount/sampleCount 为数值", () => {
    expect(parseWithSchema({ taskCount: 3, sampleCount: 54 }, qualityOverviewSchema)).toEqual({
      taskCount: 3,
      sampleCount: 54,
    });
    expect(() => parseWithSchema({ taskCount: 3 }, qualityOverviewSchema)).toThrow(ApiError);
  });
});

describe("request seam 集成（fetch mock）", () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  function mockFetchOnce(payload: unknown) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ code: "0000", info: "success", data: payload }),
    } as Response);
  }

  it("结构性损坏在 request 边界抛 ESCHEMA", async () => {
    mockFetchOnce({ totalRequests: "corrupted" });
    await expect(dashboardApi.overview()).rejects.toThrow(/ESCHEMA|响应结构校验失败|totalRequests/);
  });

  it("信封错误码优先于 schema 校验", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ code: "E001", info: "业务错误" }),
    } as Response);
    await expect(dashboardApi.overview()).rejects.toThrow("业务错误");
  });

  it("合法分页载荷通过 seam", async () => {
    mockFetchOnce({
      list: [
        {
          traceId: "t1", sessionId: "s1", ownerUserId: "u1", sourceService: "svc",
          agentId: "a1", userQuery: "q", intentType: "i", branchType: "b",
          agentStatus: "ok", costTimeMs: 1, modelVersion: "m", createTime: "c",
        },
      ],
      total: 1,
      page: 1,
      size: 20,
    });
    const result = await queryApi.traceList({});
    expect(result.total).toBe(1);
    expect(result.list[0].traceId).toBe("t1");
  });
});
