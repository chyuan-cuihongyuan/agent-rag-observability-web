"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@chyuan/ui-kit";
import { Badge } from "@chyuan/ui-kit";
import type { FullTrace, ToolCallLog, MemoryRecallLog } from "@chyuan/ui-kit";

interface WaterfallStage {
  name: string;
  costMs: number;
  detail?: string;
  color: string;
  icon: string;
}

/**
 * 全链路瀑布图组件
 * 展示从用户输入到最终答案的每一步耗时，形成水平瀑布图
 */
export function TraceWaterfall({ trace }: { trace: FullTrace }) {
  const stages = useMemo(() => buildStages(trace), [trace]);
  if (stages.length === 0) return null;

  const totalCost = stages.reduce((sum, s) => sum + s.costMs, 0);
  const maxCost = Math.max(...stages.map((s) => s.costMs));

  return (
    <Card className="border-l-4 border-l-violet-500">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-violet-500">&#9654;</span> 全链路瀑布图
          <Badge variant="outline" className="ml-auto font-mono">
            总耗时: {formatMs(totalCost)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {stages.map((stage, idx) => (
            <WaterfallRow
              key={idx}
              stage={stage}
              maxCost={maxCost}
              totalCost={totalCost}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WaterfallRow({
  stage,
  maxCost,
  totalCost,
}: {
  stage: WaterfallStage;
  maxCost: number;
  totalCost: number;
}) {
  const pctOfMax = maxCost > 0 ? (stage.costMs / maxCost) * 100 : 0;
  const pctOfTotal = totalCost > 0 ? (stage.costMs / totalCost) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1.5 group hover:bg-muted/30 rounded px-2 -mx-2">
      {/* 阶段名称 */}
      <div className="w-32 shrink-0 flex items-center gap-2">
        <span className="text-sm">{stage.icon}</span>
        <span className="text-sm text-foreground truncate">{stage.name}</span>
      </div>

      {/* 条形图 */}
      <div className="flex-1 min-w-0">
        <div className="h-6 bg-muted/50 rounded-sm overflow-hidden relative">
          <div
            className="h-full rounded-sm transition-all duration-500"
            style={{
              width: `${Math.max(pctOfMax, stage.costMs > 0 ? 2 : 0)}%`,
              backgroundColor: stage.color,
            }}
          />
          {/* 条内百分比 */}
          {stage.costMs > 0 && pctOfTotal > 5 && (
            <span className="absolute inset-y-0 left-2 flex items-center text-[10px] text-white font-mono drop-shadow">
              {pctOfTotal.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* 耗时 */}
      <div className="w-20 shrink-0 text-right font-mono text-sm text-muted-foreground">
        {formatMs(stage.costMs)}
      </div>

      {/* 详情 */}
      {stage.detail && (
        <div className="w-40 shrink-0 text-xs text-muted-foreground truncate" title={stage.detail}>
          {stage.detail}
        </div>
      )}
    </div>
  );
}

/**
 * 从 Trace 数据构建瀑布图阶段
 */
function buildStages(trace: FullTrace): WaterfallStage[] {
  const stages: WaterfallStage[] = [];

  // 1. Agent 决策（意图识别 + 分支选择）
  const agentCost = trace.agentDecision?.costTimeMs;
  if (agentCost && agentCost > 0) {
    const branchType = trace.agentDecision?.branchType || "";
    const intentType = trace.agentDecision?.intentType || "";
    stages.push({
      name: "Agent 决策",
      costMs: agentCost,
      detail: [branchType, intentType].filter(Boolean).join(" / ") || undefined,
      color: "#8b5cf6",
      icon: "\u{1F9E0}",
    });
  }

  // 2. RAG 检索阶段（从 retrievalStages 解析）
  const retrievalStagesStr = trace.ragRetrieval?.retrievalStages;
  if (retrievalStagesStr) {
    try {
      const ragStages: Array<{ stage: string; count?: number; costMs?: number }> =
        JSON.parse(retrievalStagesStr);
      if (Array.isArray(ragStages)) {
        const stageColors: Record<string, { color: string; icon: string }> = {
          query_rewrite: { color: "#f59e0b", icon: "\u270F\uFE0F" },
          multi_path_retrieval: { color: "#3b82f6", icon: "\u{1F50D}" },
          rrf_fusion: { color: "#06b6d4", icon: "\u{1F517}" },
          rerank: { color: "#ec4899", icon: "\u{1F4CA}" },
          litm_reorder: { color: "#84cc16", icon: "\u{1F522}" },
          vector: { color: "#3b82f6", icon: "\u{1F50D}" },
          bm25: { color: "#f97316", icon: "\u{1F4D6}" },
        };
        for (const rs of ragStages) {
          const meta = stageColors[rs.stage] || { color: "#6b7280", icon: "\u2699\uFE0F" };
          stages.push({
            name: formatStageName(rs.stage),
            costMs: rs.costMs || 0,
            detail: rs.count !== undefined ? `${rs.count} 条` : undefined,
            color: meta.color,
            icon: meta.icon,
          });
        }
      }
    } catch {
      // retrievalStages 不是有效 JSON，忽略
    }
  }

  // 3. 工具调用
  const toolCalls = trace.toolCalls;
  if (toolCalls && toolCalls.length > 0) {
    for (const tc of toolCalls) {
      const statusIcon = tc.status === "SUCCESS" ? "\u2705" : "\u274C";
      stages.push({
        name: `\u{1F527} ${tc.toolName}`,
        costMs: tc.costTimeMs || 0,
        detail: `${statusIcon} ${truncateStr(tc.toolInput, 30)}`,
        color: "#f97316",
        icon: "",
      });
    }
  }

  // 4. 记忆检索（取列表中第一条展示耗时）
  const memoryRecalls = trace.memoryRecalls;
  const memoryRecall = memoryRecalls && memoryRecalls.length > 0 ? memoryRecalls[0] : null;
  if (memoryRecall && memoryRecall.costTimeMs && memoryRecall.costTimeMs > 0) {
    const totalMemories =
      (memoryRecall.sessionMemoryCount || 0) + (memoryRecall.agentMemoryCount || 0);
    stages.push({
      name: "记忆检索",
      costMs: memoryRecall.costTimeMs,
      detail: `${totalMemories} 条记忆`,
      color: "#ec4899",
      icon: "\u{1F9E0}",
    });
  }

  // 5. LLM 生成
  const totalCostMs = trace.chatResult?.totalCostTimeMs;
  if (totalCostMs && totalCostMs > 0) {
    // LLM 时间 = 总时间 - 已知各阶段时间（近似）
    const knownCost = stages.reduce((s, st) => s + st.costMs, 0);
    const llmCost = totalCostMs > knownCost ? totalCostMs - knownCost : totalCostMs;
    const promptTokens = trace.chatResult?.promptTokens || 0;
    const completionTokens = trace.chatResult?.completionTokens || 0;
    const modelVersion = trace.chatResult?.modelVersion || "";
    stages.push({
      name: "LLM 生成",
      costMs: llmCost,
      detail: [modelVersion, promptTokens ? `P:${promptTokens}` : "", completionTokens ? `C:${completionTokens}` : ""]
        .filter(Boolean)
        .join(" / ") || undefined,
      color: "#10b981",
      icon: "\u26A1",
    });
  }

  return stages;
}

function formatStageName(stage: string): string {
  const nameMap: Record<string, string> = {
    query_rewrite: "Query 改写",
    multi_path_retrieval: "多路召回",
    rrf_fusion: "RRF 融合",
    rerank: "Rerank 重排",
    litm_reorder: "LITM 重排",
    vector: "向量检索",
    bm25: "BM25 检索",
  };
  return nameMap[stage] || stage;
}

function formatMs(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function truncateStr(text: string | undefined | null, maxLen: number): string {
  if (!text) return "-";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}
