"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const pageSize = 20;

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    try {
      const t = await evalApi.queryTask(decodeURIComponent(taskId));
      setTask(t);
      setRunning(t.status === "RUNNING");
      return t;
    } catch {
      return null;
    }
  }, [taskId]);

  const loadResults = useCallback(async (currentPage = 1) => {
    if (!taskId) return;
    try {
      const r = await evalApi.queryResults(decodeURIComponent(taskId), currentPage, pageSize);
      setResults(r?.list ?? []);
      setTotal(r?.total ?? 0);
    } catch {
      setResults([]);
      setTotal(0);
    }
  }, [taskId, pageSize]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadTask(), loadResults(page)]);
    setLoading(false);
  }, [loadTask, loadResults, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  // 运行中状态时轮询
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(async () => {
      const t = await loadTask();
      if (t && t.status !== "RUNNING") {
        setRunning(false);
        await loadResults(page); // 完成后刷新结果
      } else {
        await loadResults(page); // 运行中刷新进度
      }
    }, 3000); // 每 3 秒轮询一次

    return () => clearInterval(interval);
  }, [running, loadTask, loadResults, page]);

  async function runEvaluation() {
    if (!taskId) return;
    try {
      await evalApi.runTask(decodeURIComponent(taskId));
      setRunning(true);
      await loadData();
    } catch {}
  }

  function prevPage() {
    if (page > 1) {
      setPage(page - 1);
      loadResults(page - 1);
    }
  }

  function nextPage() {
    const maxPage = Math.ceil(total / pageSize);
    if (page < maxPage) {
      setPage(page + 1);
      loadResults(page + 1);
    }
  }

  if (loading && !task) return <div className="p-6 text-center text-muted-foreground">加载中...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">评测任务详情</h1>
        <div className="flex items-center gap-3">
          {task && <TaskStatusBadge status={task.status} />}
          <Button onClick={runEvaluation} size="sm" disabled={running || !task}>
            {running ? "执行中..." : "执行评测"}
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
              {loading ? "加载中..." : running ? "评测执行中，请稍候..." : "暂无评测结果，点击「执行评测」开始"}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{r.queryText}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono ${r.overallScore >= 0.8 ? "text-green-600" : r.overallScore >= 0.6 ? "text-yellow-600" : "text-red-500"}`}>
                          {r.overallScore?.toFixed(3) ?? "-"}
                        </span>
                        {r.hallucinationFlag && <Badge variant="destructive" className="text-xs">幻觉</Badge>}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <span>召回 {r.recallScore?.toFixed(3) ?? "-"}</span>
                      <span>精确 {r.precisionScore?.toFixed(3) ?? "-"}</span>
                      <span>F1 {r.f1Score?.toFixed(3) ?? "-"}</span>
                      <span>Top3 {r.top3HitRate?.toFixed(3) ?? "-"}</span>
                      <span>忠实 {r.faithfulnessScore?.toFixed(3) ?? "-"}</span>
                      <span>相关 {r.relevanceScore?.toFixed(3) ?? "-"}</span>
                      <span>完整 {r.completenessScore?.toFixed(3) ?? "-"}</span>
                      <span>相似 {r.answerSimilarity?.toFixed(3) ?? "-"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {total > pageSize && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button onClick={prevPage} disabled={page === 1} size="sm" variant="outline">上一页</Button>
                  <span className="text-sm text-muted-foreground">
                    第 {page} / {Math.ceil(total / pageSize)} 页
                  </span>
                  <Button onClick={nextPage} disabled={page >= Math.ceil(total / pageSize)} size="sm" variant="outline">下一页</Button>
                </div>
              )}
            </>
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
