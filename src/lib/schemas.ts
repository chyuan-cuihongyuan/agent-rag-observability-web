import { z } from "zod";

/**
 * AUTOLOOP al-04 / 工单 1004：API 响应边界校验 schema（借鉴 colinhacks/zod）。
 *
 * 设计原则（宽容式校验）：
 * - 良性漂移放行：可选字段缺失（.nullish()）、多余字段（passthrough）
 * - 结构性拦截：核心字段类型错误（分页 list/total、主键字符串、计数数值）立即失败
 * - TS 类型源仍是 api.ts 的 interface；本文件只做运行时边界校验
 */

const nullableNumber = z.number().nullable();

/** 仪表盘总览指标：空库时后端可能回 null，容忍；类型错（string）拦截 */
export const overviewSchema = z
  .object({
    totalRequests: nullableNumber.optional(),
    successRate: nullableNumber.optional(),
    avgCostTimeMs: nullableNumber.optional(),
    emptyRetrievalRate: nullableNumber.optional(),
    failRate: nullableNumber.optional(),
  })
  .passthrough();

/** 趋势项：time_bucket 必须为字符串；计数必须为数值（null 容忍，AVG 空集） */
export const trendItemSchema = z
  .object({
    time_bucket: z.string(),
    request_count: z.number(),
    fail_count: z.number(),
    avg_cost_ms: nullableNumber,
  })
  .passthrough();
export const trendListSchema = z.array(trendItemSchema);

/** Trace 列表项：主键与核心维度字段必须类型正确 */
export const traceListItemSchema = z
  .object({
    traceId: z.string(),
    sessionId: z.string(),
    ownerUserId: z.string(),
    sourceService: z.string(),
    agentId: z.string(),
    userQuery: z.string(),
    intentType: z.string(),
    branchType: z.string(),
    agentStatus: z.string(),
    costTimeMs: z.number(),
    modelVersion: z.string(),
    createTime: z.string(),
  })
  .passthrough();

/** 分页结构：list 数组 + total 计数是页面的命脉，损坏即失败 */
export function pagedSchema<T extends z.ZodTypeAny>(item: T) {
  return z
    .object({
      list: z.array(item),
      total: z.number(),
      page: z.number(),
      size: z.number(),
    })
    .passthrough();
}

export const traceListSchema = pagedSchema(traceListItemSchema);

/** 全局质量概览：评分字段全部可选（空库/旧后端），仅任务与样本计数必须为数值 */
export const qualityOverviewSchema = z
  .object({
    avgOverallScore: nullableNumber.optional(),
    avgRecallScore: nullableNumber.optional(),
    avgFaithfulnessScore: nullableNumber.optional(),
    avgPrecisionScore: nullableNumber.optional(),
    avgMrrScore: nullableNumber.optional(),
    avgNdcgScore: nullableNumber.optional(),
    avgContextPrecision: nullableNumber.optional(),
    avgContextRecall: nullableNumber.optional(),
    avgContextRelevance: nullableNumber.optional(),
    avgAnswerCorrectness: nullableNumber.optional(),
    taskCount: z.number(),
    sampleCount: z.number(),
    updateTime: z.string().optional(),
  })
  .passthrough();
