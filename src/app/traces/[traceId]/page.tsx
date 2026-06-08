"use client";

import {useCallback, useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {type FullTrace, type MemoryRecallLog, queryApi, type ToolCallLog} from "@/lib/api";

export default function TraceDetailPage() {
  const { traceId } = useParams<{ traceId: string }>();
  const [trace, setTrace] = useState<FullTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrace = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await queryApi.traceDetail(traceId);
      setTrace(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [traceId]);

  useEffect(() => {
    if (traceId) {
      void Promise.resolve().then(loadTrace);
    }
  }, [traceId, loadTrace]);

  if (loading) return <div className="p-6 text-center text-muted-foreground">加载中...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!trace) return <div className="p-6 text-center text-muted-foreground">未找到 Trace</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trace 详情</h1>
        <span className="font-mono text-sm text-muted-foreground">{traceId}</span>
      </div>

      {/* 用户问题 - 突出展示 */}
      <UserQuestion question={trace.agentDecision?.userQuery as string} />

      {/* Agent 推理过程 */}
      <AgentThought thought={trace.agentDecision?.decisionReason as string} />

      {/* 工具调用详情 */}
      <ToolCallDetail toolCalls={trace.toolCalls} />

      {/* Query 改写对比 */}
      <QueryRewriteCompare
        original={trace.ragRetrieval?.queryText as string}
        rewritten={trace.ragRetrieval?.rewriteText as string}
      />

      {/* RAG 阶段耗时 */}
      <RetrievalStageChart stages={trace.ragRetrieval?.retrievalStages as string} />

      {/* 引用来源 */}
      <SourceDocTable sourceDocs={trace.ragRetrieval?.sourceDocs as string} />

      {/* 记忆检索 */}
      <MemoryRecall recall={trace.memoryRecall} />

      {/* 最终答案 - 突出展示 */}
      <FinalAnswer answer={trace.chatResult?.answer as string} />

      {/* Token 消耗 */}
      <TokenUsage
        promptTokens={trace.chatResult?.promptTokens as number}
        completionTokens={trace.chatResult?.completionTokens as number}
      />

      {/* 状态信息 */}
      <StatusInfo
        status={trace.agentDecision?.agentStatus as string}
        costTimeMs={trace.agentDecision?.costTimeMs as number}
        modelVersion={trace.chatResult?.modelVersion as string}
        agentId={trace.agentId}
        sourceService={trace.sourceService}
        createTime={trace.createTime}
      />
    </div>
  );
}

/** 用户问题 - 突出展示 */
function UserQuestion({ question }: { question?: string }) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-blue-500">?</span> 用户问题
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-medium">{question || "-"}</p>
      </CardContent>
    </Card>
  );
}

/** Agent 推理过程 */
function AgentThought({ thought }: { thought?: string }) {
  if (!thought) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-purple-500">i</span> Agent 推理过程
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm font-mono">
          {thought}
        </div>
      </CardContent>
    </Card>
  );
}

/** 工具调用详情 */
function ToolCallDetail({ toolCalls }: { toolCalls: ToolCallLog[] | null }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-orange-500">T</span> 工具调用详情
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">#</th>
                <th className="text-left p-2 font-medium">工具名</th>
                <th className="text-left p-2 font-medium">入参</th>
                <th className="text-left p-2 font-medium">出参摘要</th>
                <th className="text-left p-2 font-medium">耗时</th>
                <th className="text-left p-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {toolCalls.map((tc, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-2 text-muted-foreground">{tc.callOrder || idx + 1}</td>
                  <td className="p-2 font-mono">{tc.toolName}</td>
                  <td className="p-2">
                    <div className="max-w-xs truncate" title={tc.toolInput}>
                      {truncate(tc.toolInput, 50)}
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="max-w-xs truncate" title={tc.toolOutput}>
                      {truncate(tc.toolOutput, 50)}
                    </div>
                  </td>
                  <td className="p-2 font-mono">{tc.costTimeMs}ms</td>
                  <td className="p-2">
                    <Badge variant={tc.status === "SUCCESS" ? "default" : "destructive"}>
                      {tc.status === "SUCCESS" ? "成功" : "失败"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Query 改写对比 */
function QueryRewriteCompare({ original, rewritten }: { original?: string; rewritten?: string }) {
  if (!original || !rewritten || original === rewritten) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-green-500">Q</span> Query 改写对比
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">原始查询</p>
            <div className="bg-red-50 p-3 rounded text-sm">{original}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">改写后查询</p>
            <div className="bg-green-50 p-3 rounded text-sm">{rewritten}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** RAG 阶段耗时条形图 */
function RetrievalStageChart({ stages }: { stages?: string }) {
  if (!stages) return null;

  let parsedStages: Array<{ stage: string; count?: number; costMs?: number }> = [];
  try {
    parsedStages = JSON.parse(stages);
  } catch {
    return null;
  }

  if (!Array.isArray(parsedStages) || parsedStages.length === 0) return null;

  const maxCost = Math.max(...parsedStages.map(s => s.costMs || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-cyan-500">R</span> RAG 检索阶段耗时
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {parsedStages.map((stage, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <span className="w-24 text-sm text-muted-foreground">{stage.stage}</span>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full"
                  style={{ width: `${maxCost > 0 ? ((stage.costMs || 0) / maxCost) * 100 : 0}%` }}
                />
              </div>
              <span className="w-16 text-right text-sm font-mono">{stage.costMs || 0}ms</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** 引用来源表格 */
function SourceDocTable({ sourceDocs }: { sourceDocs?: string }) {
  if (!sourceDocs) return null;

  let docs: Array<{ chunkId?: string; content?: string; score?: number; source?: string }> = [];
  try {
    docs = JSON.parse(sourceDocs);
  } catch {
    return null;
  }

  if (!Array.isArray(docs) || docs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-yellow-500">D</span> 引用来源
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">#</th>
                <th className="text-left p-2 font-medium">文档来源</th>
                <th className="text-left p-2 font-medium">分数</th>
                <th className="text-left p-2 font-medium">内容片段</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="p-2 text-muted-foreground">{idx + 1}</td>
                  <td className="p-2 font-mono text-xs">{doc.source || doc.chunkId || "-"}</td>
                  <td className="p-2">
                    <Badge variant="outline">{doc.score ? (doc.score * 100).toFixed(0) + "%" : "-"}</Badge>
                  </td>
                  <td className="p-2">
                    <div className="max-w-md truncate" title={doc.content}>
                      {truncate(doc.content, 100)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** 记忆检索结果 */
function MemoryRecall({ recall }: { recall: MemoryRecallLog | null }) {
  if (!recall) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-pink-500">M</span> 记忆检索
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">会话级记忆命中</p>
            <p className="text-2xl font-bold">{recall.sessionMemoryCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Agent 级记忆命中</p>
            <p className="text-2xl font-bold">{recall.agentMemoryCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">检索耗时</p>
            <p className="text-2xl font-bold">{recall.costTimeMs}ms</p>
          </div>
        </div>
        {recall.queryText && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">检索查询</p>
            <p className="text-sm bg-muted p-2 rounded">{recall.queryText}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** 最终答案 - 突出展示 */
function FinalAnswer({ answer }: { answer?: string }) {
  if (!answer) return null;

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-green-500">A</span> 最终答案
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
      </CardContent>
    </Card>
  );
}

/** Token 消耗 */
function TokenUsage({ promptTokens, completionTokens }: { promptTokens?: number; completionTokens?: number }) {
  if (!promptTokens && !completionTokens) return null;

  const total = (promptTokens || 0) + (completionTokens || 0);
  const cost = (total / 1000000) * 2; // 假设 ¥2/1M tokens

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-indigo-500">$</span> Token 消耗
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Prompt Tokens</p>
            <p className="text-xl font-mono">{promptTokens || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Completion Tokens</p>
            <p className="text-xl font-mono">{completionTokens || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">总计</p>
            <p className="text-xl font-mono font-bold">{total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">估算成本</p>
            <p className="text-xl font-mono text-green-600">¥{cost.toFixed(4)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** 状态信息 */
function StatusInfo({
  status,
  costTimeMs,
  modelVersion,
  agentId,
  sourceService,
  createTime,
}: {
  status?: string;
  costTimeMs?: number;
  modelVersion?: string;
  agentId?: string;
  sourceService?: string;
  createTime?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">状态信息</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">状态</p>
            <Badge variant={status === "SUCCESS" ? "default" : "destructive"}>
              {status === "SUCCESS" ? "成功" : status || "-"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">总耗时</p>
            <p className="font-mono">{costTimeMs ? `${costTimeMs}ms` : "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">模型版本</p>
            <p className="font-mono">{modelVersion || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Agent ID</p>
            <p className="font-mono">{agentId || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">来源服务</p>
            <p>{sourceService || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">创建时间</p>
            <p>{createTime || "-"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** 截断文本 */
function truncate(text: string | undefined | null, maxLen: number): string {
  if (!text) return "-";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}
