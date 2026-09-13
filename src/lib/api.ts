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

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
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

    return parseResponse<T>(text, res.status);
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
  qualityOverview: (limit = 10) =>
    request<QualityOverview>(`/api/v1/eval/quality_overview?limit=${limit}`),
  /** 生成评测种子数据（供主页质量概览面板） */
  seedEval: (taskCount = 3, itemsPerTask = 18) =>
    request<{ totalResults: number; taskCount: number; itemsPerTask: number; costTimeMs: number }>(
      `/api/v1/seed/eval?taskCount=${taskCount}&itemsPerTask=${itemsPerTask}`,
      { method: "POST" }
    ),
  // ========== 评测工作台：三池/版本/冻结（工单 0134 R2 后端 + 0140 前端） ==========
  listDatasetsByPool: (pool: string, page = 1, size = 50) =>
    request<DatasetList>(`/api/v1/eval/dataset/pool/${pool}?page=${page}&size=${size}`),
  listDatasetVersions: (datasetId: string) =>
    request<{ list: EvalDatasetDetail[] }>(`/api/v1/eval/dataset/${datasetId}/versions`),
  copyDatasetVersion: (datasetId: string) =>
    request<EvalDatasetDetail>(`/api/v1/eval/dataset/${datasetId}/copy-version`, { method: "POST" }),
  freezeDataset: (datasetId: string, frozen: boolean) =>
    request<string>(`/api/v1/eval/dataset/${datasetId}/${frozen ? "freeze" : "unfreeze"}`, { method: "POST" }),
};

// ========== 巡检拨测（工单 0137 S1 后端 + 0140 前端） ==========

/** 巡检拨测记录 */
export interface PatrolRecord {
  id: number;
  roundId: string;
  taskRef: string;
  query: string;
  agentId?: string;
  /** SUCCESS / FAIL / TIMEOUT */
  status: string;
  score?: number | null;
  durationMs: number;
  errorSummary?: string;
  traceId?: string;
  createTime: string;
}

/** 巡检轮次汇总（/patrol/latest；roundId=null 表示从未巡检） */
export interface PatrolRoundSummary {
  roundId: string | null;
  total: number;
  success: number;
  fail: number;
  timeout: number;
  avgScore?: number | null;
  finishedAt?: string | null;
}

export const patrolApi = {
  records: (page = 1, size = 20) =>
    request<PatrolRecord[]>(`/api/v1/patrol/records?page=${page}&size=${size}`),
  latest: () => request<PatrolRoundSummary>(`/api/v1/patrol/latest`),
  trigger: () => request<PatrolRoundSummary>(`/api/v1/patrol/trigger`, { method: "POST" }),
};

// ========== Case 挖掘与归因（工单 0138/0139 后端 + 0140 前端） ==========

/** Case 候选 */
export interface CaseCandidate {
  id: number;
  /** EVAL_LOW_SCORE / TRACE_FAIL / PATROL_FAIL */
  source: string;
  sourceRef: string;
  traceId?: string;
  query?: string;
  answerSummary?: string;
  hitDocCount?: number;
  toolList?: string;
  reason?: string;
  /** PENDING / PROMOTED / IGNORED */
  status: string;
  promotedDatasetId?: string;
  createTime: string;
  /** PLANNING / TOOL / ENVIRONMENT / SKILL（未标注 null） */
  attribution?: string | null;
  attributionNote?: string;
  attributionBy?: string;
  attributionAt?: string;
}

/** 归因分布统计行（四层全量返回） */
export interface AttributionStatRow {
  attribution: string;
  count: number;
  ratio: number;
}

export const caseApi = {
  candidates: (source = "", page = 1, size = 20) =>
    request<CaseCandidate[]>(
      `/api/v1/eval/cases/candidates?source=${encodeURIComponent(source)}&page=${page}&size=${size}`
    ),
  collect: (config?: { lowScoreThreshold?: number; scanLimit?: number }) =>
    request<Record<string, number>>(`/api/v1/eval/cases/collect`, {
      method: "POST",
      body: JSON.stringify(config ?? {}),
    }),
  promote: (ids: number[], datasetName?: string) =>
    request<{ promoted: number; datasetId: string }>(`/api/v1/eval/cases/promote`, {
      method: "POST",
      body: JSON.stringify({ ids, datasetName }),
    }),
  ignore: (ids: number[]) =>
    request<{ ignored: number }>(`/api/v1/eval/cases/ignore`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  attribute: (id: number, attribution: string, note?: string) =>
    request<{ updated: number }>(`/api/v1/eval/cases/${id}/attribution`, {
      method: "PATCH",
      body: JSON.stringify({ attribution, note }),
    }),
  attributionStats: (startTime = "", endTime = "", source = "") =>
    request<AttributionStatRow[]>(
      `/api/v1/eval/cases/attribution/stats?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(
        endTime
      )}&source=${encodeURIComponent(source)}`
    ),
};

// ========== 评测门禁（工单 0136 R4 后端 + 0140 前端） ==========

/** 门禁规则 */
export interface GateRule {
  gateId: string;
  name: string;
  /** 安全维度 JSON {dim: minSafety} */
  safetyDimsJson?: string;
  /** 质量分阈值 JSON {metric: min} */
  scoreThresholdsJson?: string;
  trials?: number;
  enabled?: number | boolean;
  createTime?: string;
}

/** 门禁判定记录（PASS/BLOCK + 触发明细） */
export interface GateRecord {
  recordId: string;
  gateId: string;
  taskId: string;
  /** PASS / BLOCK */
  result: string;
  /** 触发明细 JSON 数组 [{ruleType,dim,actual,threshold,note}] */
  triggerDetail?: string;
  createTime: string;
}

export const gateApi = {
  list: (page = 1, size = 50) =>
    request<{ list: GateRule[]; total?: number }>(`/api/v1/eval/gate/list?page=${page}&size=${size}`),
  latestRecord: (gateId: string) =>
    request<GateRecord>(`/api/v1/eval/gate/record/latest?gateId=${encodeURIComponent(gateId)}`),
  recordList: (gateId = "", page = 1, size = 20) =>
    request<{ list: GateRecord[]; total?: number }>(
      `/api/v1/eval/gate/record/list?gateId=${encodeURIComponent(gateId)}&page=${page}&size=${size}`
    ),
};

// ========== 调度健康（工单 0189 Z6 前端；后端端点可能滞后落地，调用方须 catch 兜底空数据） ==========

/** 定时任务运行状态（/api/v1/schedulers/status；任务注册表模式收集） */
export interface SchedulerStatus {
  /** 任务名：patrol / mining / retention / drift / slo */
  task: string;
  /** 最近运行时间（空=从未运行） */
  lastRunAt?: string | null;
  /** 最近一次运行结果（如 SUCCESS / FAIL） */
  lastResult?: string | null;
  /** 下次触发提示（cron 或人话描述；可空） */
  nextHint?: string | null;
}

export const schedulerApi = {
  /** 查询全部定时任务最近运行状态 */
  status: () => request<SchedulerStatus[]>(`/api/v1/schedulers/status`),
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
  // 版本化 + 三池 + 冻结（工单 0134 R2）
  version?: number;
  /** golden / challenge / wrong / null=未分类 */
  pool?: string | null;
  /** trace / manual / seed */
  source?: string | null;
  frozen?: boolean;
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
