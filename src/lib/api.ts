import type { ZodType } from "zod";

import {
  overviewSchema,
  trendListSchema,
  traceListSchema,
  qualityOverviewSchema,
} from "@/lib/schemas";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * API 统一错误类
 * - httpStatus: HTTP 状态码（如 404、500）
 * - code: 业务错误码（如 "0000" 表示成功）
 * - message: 可读的错误描述
 */
export class ApiError extends Error {
  /** HTTP 状态码 */
  public readonly httpStatus?: number;
  /** 业务错误码 */
  public readonly code?: string;
  /** 后端是否不可用（网络错误 / CORS / 服务未启动） */
  public readonly isUnavailable: boolean;

  constructor(
    message: string,
    httpStatus?: number,
    code?: string,
    isUnavailable = false
  ) {
    super(message);
    this.name = "ApiError";
    this.httpStatus = httpStatus;
    this.code = code;
    this.isUnavailable = isUnavailable;
  }
}

/**
 * 判断错误消息是否表示后端服务不可用
 */
export function isBackendUnavailable(message: string): boolean {
  return ["Failed to fetch", "NetworkError", "Load failed", "CORS"].some((keyword) =>
    message.includes(keyword)
  );
}

/**
 * 判断传入的错误是否为后端不可用错误
 */
export function isApiUnavailableError(error: unknown): boolean {
  return error instanceof ApiError && error.isUnavailable;
}

/** 标准后端响应信封格式 { code, info, data } */
type ApiEnvelope<T = unknown> = {
  code?: string;
  info?: string;
  data?: T;
  [key: string]: unknown;
};

/**
 * 解析 JSON 响应，兼容两种格式：
 * 1. 标准信封格式：{ code: "0000", info: "success", data: {...} }
 * 2. 直接数据格式：{ ... }（无 code/info/data 包装）
 */
function parseResponse<T>(text: string, httpStatus: number): T {
  let json: ApiEnvelope<T>;

  if (!text) {
    throw new ApiError(`API ${httpStatus}: 无响应内容`, httpStatus);
  }

  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError(`API ${httpStatus}: 响应解析失败`, httpStatus);
  }

  // 检查是否为标准信封格式（包含 code 字段）
  if ("code" in json && json.code !== undefined) {
    if (json.code !== "0000") {
      throw new ApiError(json.info || "请求失败", httpStatus, json.code);
    }
    // 标准格式：返回 data 字段的内容
    return json.data !== undefined ? json.data : ({} as T);
  }

  // 直接数据格式：返回整个 JSON 对象
  return json as T;
}

/**
 * 构造请求 URL：拒绝绝对/协议相对路径，强制锚定 API_BASE。
 * 防 path 注入逃逸后端基址（Mimosa SSRF 高位修复，loop-205）。导出以供单测锁定行为。
 */
export function buildUrl(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new ApiError(`非法 API 路径: ${path}`, undefined, "E400");
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

/**
 * AUTOLOOP al-04 / 工单 1004：响应边界校验（借鉴 colinhacks/zod）。
 * schema 由 safeParse 校验：结构性损坏抛 ApiError(code=ESCHEMA) 并带字段路径摘要。
 * 导出以供单测锁定行为。
 */
export function parseWithSchema<T>(data: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const summary = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new ApiError(`响应结构校验失败: ${summary}`, undefined, "ESCHEMA");
  }
  return result.data;
}

/** 请求选项：透传 fetch init，另可携带响应校验 schema（输出类型由调用方 T 收口） */
type RequestOptions = RequestInit & { schema?: ZodType };

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { schema, ...init } = options ?? {};
  try {
    const res = await fetch(buildUrl(path), {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...init,
    });

    const text = await res.text();

    // HTTP 层面失败（4xx / 5xx）
    if (!res.ok) {
      let errorMessage = `API ${res.status}: ${res.statusText}`;
      try {
        const errorJson = JSON.parse(text);
        if (errorJson.info) errorMessage = errorJson.info;
      } catch {
        // 响应不是 JSON，使用默认错误信息
      }
      throw new ApiError(errorMessage, res.status, undefined);
    }

    const data = parseResponse<T>(text, res.status);
    return schema ? (parseWithSchema(data, schema) as T) : data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "未知错误";
    throw new ApiError(
      `请求失败: ${message}`,
      undefined,
      undefined,
      isBackendUnavailable(message)
    );
  }
}

// Dashboard
export const dashboardApi = {
  overview: (days = 1) =>
    request<Overview>(`/api/v1/dashboard/overview?days=${days}`, {
      schema: overviewSchema,
    }),
  trend: (days = 1, interval = "hour") =>
    request<TrendItem[]>(
      `/api/v1/dashboard/trend?days=${days}&interval=${interval}`,
      { schema: trendListSchema }
    ),
  branchDistribution: (days = 7) =>
    request<BranchItem[]>(`/api/v1/dashboard/branch_distribution?days=${days}`),
  toolUsage: (days = 7) =>
    request<ToolItem[]>(`/api/v1/dashboard/tool_usage?days=${days}`),
  errorRanking: (days = 7) =>
    request<ErrorItem[]>(`/api/v1/dashboard/error_ranking?days=${days}`),
};

// Query
export const queryApi = {
  traceDetail: (traceId: string) =>
    request<FullTrace>(`/api/v1/query/trace/${traceId}`),
  traceList: (body: TraceQuery) =>
    request<PagedResult<TraceListItem>>(`/api/v1/query/trace/list`, {
      method: "POST",
      body: JSON.stringify(body),
      schema: traceListSchema,
    }),
  bySession: (sessionId: string, page = 1, size = 20) =>
    request<AgentDecision[]>(`/api/v1/query/session/${sessionId}?page=${page}&size=${size}`),
  byUser: (userId: string, tenantId: string, page = 1, size = 20) =>
    request<AgentDecision[]>(`/api/v1/query/user/${userId}/traces?tenantId=${tenantId}&page=${page}&size=${size}`),
};

// Evaluate
export const evalApi = {
  createDataset: (data: EvalDataset) =>
    request<string>(`/api/v1/eval/dataset`, { method: "POST", body: JSON.stringify(data) }),
  listDatasets: (page = 1, size = 20) =>
    request<DatasetList>(`/api/v1/eval/dataset/list?page=${page}&size=${size}`),
  createTask: (data: EvalTask) =>
    request<string>(`/api/v1/eval/task`, { method: "POST", body: JSON.stringify(data) }),
  queryTask: (taskId: string) =>
    request<EvalTaskDetail>(`/api/v1/eval/task/${taskId}`),
  listTasks: (page = 1, size = 20) =>
    request<PagedResult<EvalTaskDetail>>(`/api/v1/eval/task/list?page=${page}&size=${size}`),
  saveResult: (data: EvalResult) =>
    request<string>(`/api/v1/eval/result`, { method: "POST", body: JSON.stringify(data) }),
  runTask: (taskId: string) =>
    request<string>(`/api/v1/eval/task/${taskId}/run`, { method: "POST" }),
  queryResults: (taskId: string, page = 1, size = 20) =>
    request<PagedResult<EvalResult>>(`/api/v1/eval/result/${taskId}?page=${page}&size=${size}`),
  compareResults: (task1: string, task2: string) =>
    request<CompareItem[]>(`/api/v1/eval/result/compare?task1=${task1}&task2=${task2}`),
  qualityOverview: (limit = 10) =>
    request<QualityOverview>(`/api/v1/eval/quality_overview?limit=${limit}`, {
      schema: qualityOverviewSchema,
    }),
  /** 生成评测种子数据（供主页质量概览面板） */
  seedEval: (taskCount = 3, itemsPerTask = 18) =>
    request<{ totalResults: number; taskCount: number; itemsPerTask: number; costTimeMs: number }>(
      `/api/v1/seed/eval?taskCount=${taskCount}&itemsPerTask=${itemsPerTask}`,
      { method: "POST" }
    ),
};

// Types
export interface Overview {
  totalRequests: number;
  successRate: number;
  avgCostTimeMs: number;
  emptyRetrievalRate: number;
  failRate: number;
}

/** 全局质量概览 — 主页仪表盘 RAG 质量面板用（加权均值） */
export interface QualityOverview {
  avgOverallScore?: number;
  avgRecallScore?: number;
  avgFaithfulnessScore?: number;
  avgPrecisionScore?: number;
  avgMrrScore?: number;
  avgNdcgScore?: number;
  avgContextPrecision?: number;
  avgContextRecall?: number;
  avgContextRelevance?: number;
  avgAnswerCorrectness?: number;
  taskCount: number;
  sampleCount: number;
  updateTime?: string;
}

export interface TrendItem {
  time_bucket: string;
  request_count: number;
  avg_cost_ms: number;
  fail_count: number;
}

export interface BranchItem {
  branch_type: string;
  count: number;
}

export interface ToolItem {
  tool_name: string;
  call_count: number;
  avg_cost_ms: number;
}

export interface ErrorItem {
  error_message: string;
  count: number;
  agent_id: string;
}

export interface ToolCallLog {
  traceId: string;
  spanId: string;
  parentSpanId: string;
  toolName: string;
  toolInput: string;
  toolOutput: string;
  status: 'SUCCESS' | 'FAIL' | 'TIMEOUT';
  costTimeMs: number;
  errorMessage: string;
  callOrder: number;
  createTime: string;
}

export interface MemoryRecallLog {
  traceId: string;
  queryText: string;
  sessionMemoryCount: number;
  agentMemoryCount: number;
  sessionMemoryScores: number[];
  agentMemoryScores: number[];
  injectContent: string;
  costTimeMs: number;
  createTime: string;
}

/** Agent 决策数据 */
export interface AgentDecisionData {
  traceId: string;
  sessionId?: string;
  agentId?: string;
  userQuery?: string;
  intentType?: string;
  selectedToolList?: string[];
  decisionReason?: string;
  branchType?: string;
  planSteps?: string;
  toolCallTimes?: number;
  toolRetryTimes?: number;
  agentStatus?: string;
  costTimeMs?: number;
  modelVersion?: string;
  errorMessage?: string;
  createTime?: string;
}

/** RAG 检索数据 */
export interface RagRetrievalData {
  traceId?: string;
  queryText?: string;
  rewriteText?: string;
  retrievalTopk?: number;
  retrievalCount?: number;
  sourceDocs?: string;
  rerankScores?: string;
  emptyRetrieval?: number;
  retrievalCostMs?: number;
  retrievalStages?: string;
  ragStrategyVersion?: string;
  createTime?: string;
}

/** 聊天结果数据 */
export interface ChatResultData {
  traceId?: string;
  question?: string;
  answer?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalCostTimeMs?: number;
  finalStatus?: string;
  modelVersion?: string;
  createTime?: string;
}

/** Trace 在线质量评分（实时派生） */
export interface TraceQuality {
  retrievalQuality?: number | null;
  faithfulness?: number | null;
  answerRelevance?: number | null;
}

export interface FullTrace {
  traceId: string;
  sessionId: string;
  ownerUserId: string;
  agentId: string;
  sourceService: string;
  createTime: string;
  agentDecision: AgentDecisionData | null;
  ragRetrieval: RagRetrievalData | null;
  chatResult: ChatResultData | null;
  toolCalls: ToolCallLog[] | null;
  memoryRecalls: MemoryRecallLog[] | null;
  quality?: TraceQuality | null;
}

export interface TraceQuery {
  tenantId?: string;
  ownerUserId?: string;
  sessionId?: string;
  agentId?: string;
  branchType?: string;
  agentStatus?: string;
  sourceService?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  size?: number;
}

export interface TraceListItem {
  traceId: string;
  sessionId: string;
  ownerUserId: string;
  sourceService: string;
  agentId: string;
  userQuery: string;
  intentType: string;
  branchType: string;
  agentStatus: string;
  costTimeMs: number;
  modelVersion: string;
  createTime: string;
}

export interface AgentDecision {
  traceId: string;
  sessionId: string;
  agentId: string;
  userQuery: string;
  intentType: string;
  agentStatus: string;
  costTimeMs: number;
  createTime: string;
}

export interface PagedResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
}

export interface EvalDataset {
  datasetId: string;
  datasetName: string;
  description: string;
  itemCount: number;
  itemsJson: string;
}

export interface DatasetList {
  list: EvalDatasetDetail[];
}

export interface EvalDatasetDetail {
  datasetId: string;
  datasetName: string;
  description: string;
  itemCount: number;
  createTime: string;
}

export interface EvalTask {
  taskName: string;
  evalType: string;
  datasetId: string;
  modelVersion: string;
  ragStrategyVersion: string;
}

export interface EvalTaskDetail {
  taskId: string;
  taskName: string;
  evalType: string;
  datasetId: string;
  status: string;
  totalCount?: number;
  completedCount?: number;
  modelVersion: string;
  ragStrategyVersion: string;
  avgOverallScore: number;
  createTime: string;
  updateTime: string;
}

export interface EvalResult {
  taskId: string;
  traceId: string;
  queryText: string;
  standardAnswer: string;
  actualAnswer: string;
  recallScore: number;
  precisionScore: number;
  f1Score: number;
  top3HitRate: number;
  mrrScore?: number;
  ndcgScore?: number;
  mapScore?: number;
  answerSimilarity: number;
  contextPrecision?: number;
  contextRecall?: number;
  contextRelevance?: number;
  faithfulnessScore: number;
  relevanceScore: number;
  hallucinationFlag: number;
  completenessScore: number;
  answerCorrectness?: number;
  overallScore: number;
  evalDetail: string;
  createTime: string;

  // 工具调用评测字段
  toolSelectionScore?: number;
  toolParamScore?: number;
  toolCallScore?: number;

  // Agent 决策评测字段
  intentScore?: number;
  branchScore?: number;
  reasoningScore?: number;
  agentDecisionScore?: number;

  [key: string]: unknown;
}

export interface CompareItem {
  taskId: string;
  avgOverallScore: number;
  avgRecallScore: number;
  avgFaithfulnessScore: number;
  avgPrecisionScore?: number;
  avgMrrScore?: number;
  avgNdcgScore?: number;
  avgContextPrecision?: number;
  avgContextRecall?: number;
  avgContextRelevance?: number;
  avgAnswerCorrectness?: number;
  count: number;
}
