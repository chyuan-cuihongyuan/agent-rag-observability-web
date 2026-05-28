"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { evalApi, type EvalTaskDetail, type EvalResult } from "@/lib/api";

export default function EvalTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<EvalTaskDetail | null>(null);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (taskId) loadData();
  }, [taskId]);

  async function loadData() {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        evalApi.queryTask(decodeURIComponent(taskId)).catch(() => null),
        evalApi.queryResults(decodeURIComponent(taskId)).catch(() => ({ list: [], total: 0 })),
      ]);
      if (t) setTask(t);
      setResults(r?.list ?? []);
      setTotal(r?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function runEvaluation() {
    try {
      await evalApi.runTask(decodeURIComponent(taskId));
      loadData();
    } catch {}
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">加载中...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">评测任务详情</h1>
        <div className="flex items-center gap-3">
          {task && <TaskStatusBadge status={task.status} />}
          <Button onClick={runEvaluation} size="sm" disabled={task?.status === "RUNNING"}>
            {task?.status === "RUNNING" ? "执行中..." : "执行评测"}
          </Button>
        </div>
      </div>

      {/* Task Info */}
      {task && (
        <Card>
          <CardHeader><CardTitle className="text-base">任务信息</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">任务ID</p><p className="font-mono">{task.taskId}</p></div>
              <div><p className="text-xs text-muted-foreground">任务名称</p><p>{task.taskName}</p></div>
              <div><p className="text-xs text-muted-foreground">评测类型</p><p>{task.evalType}</p></div>
              <div><p className="text-xs text-muted-foreground">模型版本</p><p>{task.modelVersion || "-"}</p></div>
              <div><p className="text-xs text-muted-foreground">RAG策略</p><p>{task.ragStrategyVersion || "-"}</p></div>
              <div><p className="text-xs text-muted-foreground">数据集ID</p><p className="font-mono">{task.datasetId}</p></div>
              <div><p className="text-xs text-muted-foreground">平均评分</p><p className="font-mono">{task.avgOverallScore?.toFixed(2) ?? "-"}</p></div>
              <div><p className="text-xs text-muted-foreground">创建时间</p><p className="text-xs">{task.createTime}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">评测结果</CardTitle>
          <span className="text-sm text-muted-foreground">共 {total} 条</span>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              {loading ? "加载中..." : "暂无评测结果，点击「执行评测」开始"}
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{r.queryText}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono ${r.overallScore >= 0.8 ? "text-green-600" : r.overallScore >= 0.6 ? "text-yellow-600" : "text-red-500"}`}>
                        {r.overallScore?.toFixed(2) ?? "-"}
                      </span>
                      {r.hallucinationFlag && <Badge variant="destructive" className="text-xs">幻觉</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground">
                    <span>召回 {r.recallScore?.toFixed(2) ?? "-"}</span>
                    <span>精确 {r.precisionScore?.toFixed(2) ?? "-"}</span>
                    <span>F1 {r.f1Score?.toFixed(2) ?? "-"}</span>
                    <span>Top3 {r.top3HitRate?.toFixed(2) ?? "-"}</span>
                    <span>忠实 {r.faithfulnessScore?.toFixed(2) ?? "-"}</span>
                    <span>相关 {r.relevanceScore?.toFixed(2) ?? "-"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, "default" | "secondary" | "destructive"> = {
    PENDING: "secondary",
    RUNNING: "default",
    COMPLETED: "default",
    FAILED: "destructive",
  };
  return <Badge variant={map[status] ?? "secondary"}>{status}</Badge>;
}
