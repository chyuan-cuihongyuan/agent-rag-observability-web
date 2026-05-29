const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public isUnavailable = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isBackendUnavailable(message: string): boolean {
  return ["Failed to fetch", "NetworkError", "Load failed", "CORS"].some((keyword) =>
    message.includes(keyword)
  );
}

type ApiEnvelope<T = unknown> = {
  code?: string;
  info?: string;
  data?: T;
  [key: string]: unknown;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
    const text = await res.text();
    let json: ApiEnvelope<T> = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { info: text };
      }
    }
    if (!res.ok) {
      throw new ApiError(json.info || `API ${res.status}: ${res.statusText}`, res.status, json.code);
    }
    if (json.code && json.code !== "0000") {
      throw new ApiError(json.info || "请求失败", res.status, json.code);
    }
    return json.data !== undefined ? json.data : (json as T);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "未知错误";
    throw new ApiError(`请求失败: ${message}`, undefined, undefined, isBackendUnavailable(message));
  }
}

// Dashboard
export const dashboardApi = {
  overview: (days = 1) => request<Overview>(`/api/v1/dashboard/overview?days=${days}`),
  trend: (days = 1, interval = "hour") =>
    request<TrendItem[]>(`/api/v1/dashboard/trend?days=${days}&interval=${interval}`),
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
};

// Types
export interface Overview {
  totalRequests: number;
  successRate: number;
  avgCostTimeMs: number;
  emptyRetrievalRate: number;
  failRate: number;
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

export interface FullTrace {
  traceId: string;
  sessionId: string;
  ownerUserId: string;
  sourceService: string;
  createTime: string;
  agentDecision: Record<string, unknown> | null;
  ragRetrieval: Record<string, unknown> | null;
  chatResult: Record<string, unknown> | null;
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
  intentType: string;
  agentStatus: string;
  costTimeMs: number;
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
  answerSimilarity: number;
  faithfulnessScore: number;
  relevanceScore: number;
  hallucinationFlag: boolean;
  completenessScore: number;
  overallScore: number;
  evalDetail: string;
}

export interface CompareItem {
  taskId: string;
  avgOverallScore: number;
  avgRecallScore: number;
  avgFaithfulnessScore: number;
  count: number;
}
