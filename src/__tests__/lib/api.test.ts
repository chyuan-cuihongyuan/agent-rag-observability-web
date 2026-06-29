/**
 * API 客户端单元测试
 *
 * 覆盖 Dashboard API、Query API、Evaluate API、错误处理和响应解析
 */

import {
  dashboardApi,
  queryApi,
  evalApi,
  ApiError,
  isBackendUnavailable,
  isApiUnavailableError,
} from "@/lib/api";

import type {
  Overview,
  TrendItem,
  BranchItem,
  ToolItem,
  ErrorItem,
  FullTrace,
  TraceListItem,
  AgentDecision,
  PagedResult,
  EvalDataset,
  DatasetList,
  EvalTask,
  EvalTaskDetail,
  EvalResult,
  CompareItem,
} from "@/lib/api";

// ========== Mock 设置 ==========

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

// ========== 辅助函数 ==========

/**
 * 创建标准信封格式的成功响应
 * { code: "0000", info: "success", data: T }
 */
function createEnvelopeResponse<T>(data: T, status = 200): Response {
  const body = JSON.stringify({ code: "0000", info: "success", data });
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

/**
 * 创建直接数据格式的响应（无 code/info/data 包装）
 */
function createDirectResponse<T>(data: T, status = 200): Response {
  const body = JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

/**
 * 创建 HTTP 错误响应
 */
function createErrorResponse(status: number, info?: string): Response {
  const body = info
    ? JSON.stringify({ code: "E001", info, data: null })
    : `{"error": "Internal Server Error"}`;
  return {
    ok: false,
    status,
    statusText: `HTTP ${status}`,
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

/**
 * 创建业务错误码响应（HTTP 200 但 code 非 "0000"）
 */
function createBusinessErrorResponse(code: string, info: string): Response {
  const body = JSON.stringify({ code, info, data: null });
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

// ==================== 测试用例 ====================

describe("API 客户端单元测试", () => {
  // ==================== ApiError 类 ====================
  describe("ApiError", () => {
    it("应该正确创建带完整参数的 ApiError", () => {
      const error = new ApiError("服务器错误", 500, "E001", true);

      expect(error.message).toBe("服务器错误");
      expect(error.httpStatus).toBe(500);
      expect(error.code).toBe("E001");
      expect(error.isUnavailable).toBe(true);
      expect(error.name).toBe("ApiError");
      expect(error).toBeInstanceOf(Error);
    });

    it("应该使用默认值创建 ApiError", () => {
      const error = new ApiError("未知错误");

      expect(error.httpStatus).toBeUndefined();
      expect(error.code).toBeUndefined();
      expect(error.isUnavailable).toBe(false);
    });
  });

  // ==================== isBackendUnavailable ====================
  describe("isBackendUnavailable", () => {
    it("应该识别 'Failed to fetch' 错误", () => {
      expect(isBackendUnavailable("Failed to fetch")).toBe(true);
    });

    it("应该识别 'NetworkError' 错误", () => {
      expect(isBackendUnavailable("NetworkError occurred")).toBe(true);
    });

    it("应该识别 'Load failed' 错误", () => {
      expect(isBackendUnavailable("Load failed")).toBe(true);
    });

    it("应该识别 'CORS' 错误", () => {
      expect(isBackendUnavailable("CORS error")).toBe(true);
    });

    it("应该在普通错误时返回 false", () => {
      expect(isBackendUnavailable("其他错误")).toBe(false);
    });
  });

  // ==================== isApiUnavailableError ====================
  describe("isApiUnavailableError", () => {
    it("应该在 ApiError 的 isUnavailable 为 true 时返回 true", () => {
      const error = new ApiError("网络错误", undefined, undefined, true);
      expect(isApiUnavailableError(error)).toBe(true);
    });

    it("应该在 ApiError 的 isUnavailable 为 false 时返回 false", () => {
      const error = new ApiError("业务错误", 400, "E001", false);
      expect(isApiUnavailableError(error)).toBe(false);
    });

    it("应该在非 ApiError 错误时返回 false", () => {
      expect(isApiUnavailableError(new Error("普通错误"))).toBe(false);
      expect(isApiUnavailableError(null)).toBe(false);
      expect(isApiUnavailableError("string")).toBe(false);
    });
  });

  // ==================== Dashboard API ====================
  describe("Dashboard API", () => {
    const mockOverview: Overview = {
      totalRequests: 1500,
      successRate: 0.95,
      avgCostTimeMs: 230,
      emptyRetrievalRate: 0.05,
      failRate: 0.05,
    };

    it("应该获取概览数据（默认 days=1）", async () => {
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockOverview));

      const result = await dashboardApi.overview();

      expect(result).toEqual(mockOverview);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/dashboard/overview?days=1"),
        expect.objectContaining({
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("应该获取指定天数的概览数据", async () => {
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockOverview));

      await dashboardApi.overview(7);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/dashboard/overview?days=7"),
        expect.any(Object)
      );
    });

    it("应该获取趋势数据", async () => {
      const mockTrend: TrendItem[] = [
        { time_bucket: "2024-01-01T00:00:00Z", request_count: 100, avg_cost_ms: 200, fail_count: 5 },
        { time_bucket: "2024-01-01T01:00:00Z", request_count: 120, avg_cost_ms: 180, fail_count: 3 },
      ];
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockTrend));

      const result = await dashboardApi.trend(7, "hour");

      expect(result).toEqual(mockTrend);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/dashboard/trend?days=7&interval=hour"),
        expect.any(Object)
      );
    });

    it("应该获取分支分布数据", async () => {
      const mockBranches: BranchItem[] = [
        { branch_type: "RAG", count: 800 },
        { branch_type: "LLM", count: 500 },
      ];
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockBranches));

      const result = await dashboardApi.branchDistribution(7);

      expect(result).toEqual(mockBranches);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/dashboard/branch_distribution?days=7"),
        expect.any(Object)
      );
    });

    it("应该获取工具使用数据", async () => {
      const mockTools: ToolItem[] = [
        { tool_name: "search_vector", call_count: 500, avg_cost_ms: 50 },
        { tool_name: "search_bm25", call_count: 300, avg_cost_ms: 30 },
      ];
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockTools));

      const result = await dashboardApi.toolUsage();

      expect(result).toEqual(mockTools);
    });

    it("应该获取错误排名数据", async () => {
      const mockErrors: ErrorItem[] = [
        { error_message: "检索超时", count: 20, agent_id: "agent-1" },
        { error_message: "模型限流", count: 10, agent_id: "agent-2" },
      ];
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockErrors));

      const result = await dashboardApi.errorRanking(7);

      expect(result).toEqual(mockErrors);
    });
  });

  // ==================== Query API ====================
  describe("Query API", () => {
    it("应该根据 traceId 获取 Trace 详情", async () => {
      const mockTrace: FullTrace = {
        traceId: "trace-123",
        sessionId: "session-abc",
        ownerUserId: "user-1",
        sourceService: "aiops-service",
        agentId: "agent-1",
        createTime: "2024-01-01T00:00:00Z",
        agentDecision: { traceId: "trace-123", intentType: "RAG查询" },
        ragRetrieval: { retrievalTopk: 5 },
        chatResult: { answer: "回答内容" },
        toolCalls: null,
        memoryRecalls: null,
      };
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockTrace));

      const result = await queryApi.traceDetail("trace-123");

      expect(result).toEqual(mockTrace);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/query/trace/trace-123"),
        expect.any(Object)
      );
    });

    it("应该发送 Trace 列表查询请求", async () => {
      const mockPagedResult: PagedResult<TraceListItem> = {
        list: [
          {
            traceId: "trace-1",
            sessionId: "session-1",
            ownerUserId: "user-1",
            sourceService: "service-1",
            agentId: "agent-1",
            userQuery: "测试问题",
            intentType: "RAG",
            branchType: "RAG",
            agentStatus: "SUCCESS",
            costTimeMs: 200,
            modelVersion: "gpt-4",
            createTime: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        size: 20,
      };
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockPagedResult));

      const queryBody = {
        sessionId: "session-1",
        page: 1,
        size: 20,
      };
      const result = await queryApi.traceList(queryBody);

      expect(result).toEqual(mockPagedResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/query/trace/list"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(queryBody),
        })
      );
    });

    it("应该根据 sessionId 获取 Agent 决策记录", async () => {
      const mockDecisions: AgentDecision[] = [
        {
          traceId: "trace-1",
          sessionId: "session-1",
          agentId: "agent-1",
          userQuery: "查询问题",
          intentType: "RAG",
          agentStatus: "SUCCESS",
          costTimeMs: 150,
          createTime: "2024-01-01T00:00:00Z",
        },
      ];
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockDecisions));

      const result = await queryApi.bySession("session-1", 1, 20);

      expect(result).toEqual(mockDecisions);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/query/session/session-1?page=1&size=20"),
        expect.any(Object)
      );
    });

    it("应该根据 userId 获取用户 Trace 记录", async () => {
      const mockDecisions: AgentDecision[] = [];
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockDecisions));

      const result = await queryApi.byUser("user-1", "tenant-1", 1, 10);

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/query/user/user-1/traces?tenantId=tenant-1&page=1&size=10"),
        expect.any(Object)
      );
    });
  });

  // ==================== Evaluate API ====================
  describe("Evaluate API", () => {
    it("应该创建评测数据集", async () => {
      const dataset: EvalDataset = {
        datasetId: "",
        datasetName: "测试数据集",
        description: "描述",
        itemCount: 10,
        itemsJson: "[]",
      };
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse("dataset-123"));

      const result = await evalApi.createDataset(dataset);

      expect(result).toBe("dataset-123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/eval/dataset"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(dataset),
        })
      );
    });

    it("应该获取数据集列表", async () => {
      const mockDatasetList: DatasetList = {
        list: [
          {
            datasetId: "ds-1",
            datasetName: "数据集1",
            description: "测试",
            itemCount: 20,
            createTime: "2024-01-01T00:00:00Z",
          },
        ],
      };
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockDatasetList));

      const result = await evalApi.listDatasets(1, 20);

      expect(result).toEqual(mockDatasetList);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/eval/dataset/list?page=1&size=20"),
        expect.any(Object)
      );
    });

    it("应该创建评测任务", async () => {
      const task: EvalTask = {
        taskName: "对比评测",
        evalType: "FAITHFULNESS",
        datasetId: "ds-1",
        modelVersion: "v2",
        ragStrategyVersion: "v1",
      };
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse("task-123"));

      const result = await evalApi.createTask(task);

      expect(result).toBe("task-123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/eval/task"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(task),
        })
      );
    });

    it("应该查询评测任务详情", async () => {
      const mockTaskDetail: EvalTaskDetail = {
        taskId: "task-123",
        taskName: "对比评测",
        evalType: "FAITHFULNESS",
        datasetId: "ds-1",
        status: "COMPLETED",
        modelVersion: "v2",
        ragStrategyVersion: "v1",
        avgOverallScore: 0.85,
        createTime: "2024-01-01T00:00:00Z",
        updateTime: "2024-01-01T01:00:00Z",
      };
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockTaskDetail));

      const result = await evalApi.queryTask("task-123");

      expect(result).toEqual(mockTaskDetail);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/eval/task/task-123"),
        expect.any(Object)
      );
    });

    it("应该获取评测任务列表", async () => {
      const mockPaged: PagedResult<EvalTaskDetail> = {
        list: [],
        total: 0,
        page: 1,
        size: 20,
      };
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockPaged));

      const result = await evalApi.listTasks(1, 10);

      expect(result).toEqual(mockPaged);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/eval/task/list?page=1&size=10"),
        expect.any(Object)
      );
    });

    it("应该运行评测任务", async () => {
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse("task-123"));

      const result = await evalApi.runTask("task-123");

      expect(result).toBe("task-123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/eval/task/task-123/run"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("应该保存评测结果", async () => {
      const evalResult: EvalResult = {
        taskId: "task-123",
        traceId: "trace-1",
        queryText: "问题",
        standardAnswer: "标准答案",
        actualAnswer: "实际答案",
        recallScore: 0.9,
        precisionScore: 0.85,
        f1Score: 0.87,
        top3HitRate: 0.95,
        answerSimilarity: 0.88,
        faithfulnessScore: 0.92,
        relevanceScore: 0.9,
        hallucinationFlag: 0,
        completenessScore: 0.85,
        overallScore: 0.89,
        evalDetail: "详细评测信息",
        createTime: "2024-01-01T00:00:00Z",
      };
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse("result-123"));

      const result = await evalApi.saveResult(evalResult);

      expect(result).toBe("result-123");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/eval/result"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(evalResult),
        })
      );
    });

    it("应该查询评测结果列表", async () => {
      const mockPaged: PagedResult<EvalResult> = {
        list: [],
        total: 0,
        page: 1,
        size: 20,
      };
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockPaged));

      const result = await evalApi.queryResults("task-123", 1, 20);

      expect(result).toEqual(mockPaged);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/eval/result/task-123?page=1&size=20"),
        expect.any(Object)
      );
    });

    it("应该对比两组评测结果", async () => {
      const mockCompare: CompareItem[] = [
        { taskId: "task-1", avgOverallScore: 0.85, avgRecallScore: 0.9, avgFaithfulnessScore: 0.88, count: 20 },
        { taskId: "task-2", avgOverallScore: 0.80, avgRecallScore: 0.85, avgFaithfulnessScore: 0.82, count: 20 },
      ];
      mockFetch.mockResolvedValueOnce(createEnvelopeResponse(mockCompare));

      const result = await evalApi.compareResults("task-1", "task-2");

      expect(result).toEqual(mockCompare);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/eval/result/compare?task1=task-1&task2=task-2"),
        expect.any(Object)
      );
    });
  });

  // ==================== 错误处理 ====================
  describe("错误处理", () => {
    it("应该在 HTTP 4xx 响应时抛出带状态码的 ApiError", async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(404, "资源不存在"));

      await expect(dashboardApi.overview()).rejects.toThrow("资源不存在");

      mockFetch.mockResolvedValueOnce(createErrorResponse(404, "资源不存在"));
      try {
        await dashboardApi.overview();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).httpStatus).toBe(404);
      }
    });

    it("应该在 HTTP 5xx 响应时抛出带状态码的 ApiError", async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse(500));

      try {
        await dashboardApi.overview();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).httpStatus).toBe(500);
      }
    });

    it("应该在业务错误码非 0000 时抛出 ApiError", async () => {
      mockFetch.mockResolvedValueOnce(createBusinessErrorResponse("E001", "参数错误"));

      await expect(dashboardApi.overview()).rejects.toThrow("参数错误");
    });

    it("应该在网络错误时标记 isUnavailable", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

      try {
        await dashboardApi.overview();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).isUnavailable).toBe(true);
      }
    });

    it("应该在响应内容为空时抛出错误", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: jest.fn().mockResolvedValue(""),
      } as unknown as Response);

      await expect(dashboardApi.overview()).rejects.toThrow("无响应内容");
    });

    it("应该在响应内容非 JSON 时抛出解析失败错误", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: jest.fn().mockResolvedValue("not a json string"),
      } as unknown as Response);

      await expect(dashboardApi.overview()).rejects.toThrow("响应解析失败");
    });

    it("应该在响应为直接数据格式（无信封）时正确解析", async () => {
      const directData: Overview = {
        totalRequests: 100,
        successRate: 0.9,
        avgCostTimeMs: 200,
        emptyRetrievalRate: 0.1,
        failRate: 0.1,
      };
      mockFetch.mockResolvedValueOnce(createDirectResponse(directData));

      const result = await dashboardApi.overview();

      expect(result).toEqual(directData);
    });
  });
});
