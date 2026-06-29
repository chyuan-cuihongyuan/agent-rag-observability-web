"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { evalApi, type EvalTaskDetail, type CompareItem } from "@/lib/api";

export default function EvalComparePage() {
  const [tasks, setTasks] = useState<EvalTaskDetail[]>([]);
  const [task1, setTask1] = useState("");
  const [task2, setTask2] = useState("");
  const [comparison, setComparison] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const res = await evalApi.listTasks();
      setTasks(res?.list ?? []);
    } catch {
      setTasks([]);
    }
  }, []);

  const runCompare = useCallback(async () => {
    if (!task1 || !task2) return;
    setLoading(true);
    try {
      const result = await evalApi.compareResults(task1, task2);
      setComparison(result ?? []);
    } catch {
      setComparison([]);
    } finally {
      setLoading(false);
    }
  }, [task1, task2]);

  const getTaskName = useCallback((taskId: string) => {
    const t = tasks.find((x) => x.taskId === taskId);
    return t ? `${t.taskName} (${t.evalType})` : taskId;
  }, [tasks]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTasks();
  }, [loadTasks]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">评测版本对比</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">选择对比任务</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>任务 A</Label>
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={task1}
                onChange={(e) => setTask1(e.target.value)}
              >
                <option value="">选择任务</option>
                {tasks.filter((t) => t.status === "COMPLETED").map((t) => (
                  <option key={t.taskId} value={t.taskId}>
                    {t.taskName} ({t.evalType}) - {t.avgOverallScore?.toFixed(2) ?? "-"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>任务 B</Label>
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={task2}
                onChange={(e) => setTask2(e.target.value)}
              >
                <option value="">选择任务</option>
                {tasks.filter((t) => t.status === "COMPLETED").map((t) => (
                  <option key={t.taskId} value={t.taskId}>
                    {t.taskName} ({t.evalType}) - {t.avgOverallScore?.toFixed(2) ?? "-"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={runCompare} disabled={!task1 || !task2 || loading} className="w-full">
              {loading ? "对比中..." : "开始对比"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {comparison.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">对比结果</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-6">
              {comparison.map((item, idx) => (
                <div key={item.taskId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{getTaskName(item.taskId)}</h3>
                    <Badge variant={idx === 0 ? "default" : "secondary"}>
                      {idx === 0 ? "任务 A" : "任务 B"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">平均综合分</p>
                      <p className="font-mono text-lg">{item.avgOverallScore?.toFixed(4) ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">平均召回率</p>
                      <p className="font-mono">{item.avgRecallScore?.toFixed(4) ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">平均忠实度</p>
                      <p className="font-mono">{item.avgFaithfulnessScore?.toFixed(4) ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">评测样本数</p>
                      <p className="font-mono">{item.count}</p>
                    </div>
                  </div>

                  {/* 检索质量指标（含排序感知） */}
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">检索质量</p>
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <span>精确 <span className="font-mono">{item.avgPrecisionScore?.toFixed(4) ?? "-"}</span></span>
                      <span>MRR <span className="font-mono">{item.avgMrrScore?.toFixed(4) ?? "-"}</span></span>
                      <span>NDCG <span className="font-mono">{item.avgNdcgScore?.toFixed(4) ?? "-"}</span></span>
                      <span>召回 <span className="font-mono">{item.avgRecallScore?.toFixed(4) ?? "-"}</span></span>
                    </div>
                  </div>

                  {/* 上下文相关性指标 */}
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">上下文相关性</p>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <span>上下文精确 <span className="font-mono">{item.avgContextPrecision?.toFixed(4) ?? "-"}</span></span>
                      <span>上下文召回 <span className="font-mono">{item.avgContextRecall?.toFixed(4) ?? "-"}</span></span>
                      <span>上下文相关 <span className="font-mono">{item.avgContextRelevance?.toFixed(4) ?? "-"}</span></span>
                    </div>
                  </div>

                  {/* 生成质量指标 */}
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">生成质量</p>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <span>忠实度 <span className="font-mono">{item.avgFaithfulnessScore?.toFixed(4) ?? "-"}</span></span>
                      <span>答案正确性 <span className="font-mono">{item.avgAnswerCorrectness?.toFixed(4) ?? "-"}</span></span>
                      <span>综合 <span className="font-mono">{item.avgOverallScore?.toFixed(4) ?? "-"}</span></span>
                    </div>
                  </div>

                  {/* 差异高亮 */}
                  {comparison.length === 2 && idx === 1 && (
                    <div className="mt-3 pt-3 border-t text-xs space-y-1">
                      <p className="font-medium text-muted-foreground mb-1">与任务 A 的差异</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <DiffRow label="综合分" current={item.avgOverallScore} baseline={comparison[0].avgOverallScore} />
                        <DiffRow label="召回率" current={item.avgRecallScore} baseline={comparison[0].avgRecallScore} />
                        <DiffRow label="忠实度" current={item.avgFaithfulnessScore} baseline={comparison[0].avgFaithfulnessScore} />
                        <DiffRow label="MRR" current={item.avgMrrScore} baseline={comparison[0].avgMrrScore} />
                        <DiffRow label="NDCG" current={item.avgNdcgScore} baseline={comparison[0].avgNdcgScore} />
                        <DiffRow label="上下文精确" current={item.avgContextPrecision} baseline={comparison[0].avgContextPrecision} />
                        <DiffRow label="上下文召回" current={item.avgContextRecall} baseline={comparison[0].avgContextRecall} />
                        <DiffRow label="上下文相关" current={item.avgContextRelevance} baseline={comparison[0].avgContextRelevance} />
                        <DiffRow label="答案正确性" current={item.avgAnswerCorrectness} baseline={comparison[0].avgAnswerCorrectness} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {comparison.length === 0 && task1 && task2 && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            暂无对比结果，请选择已完成状态的任务进行对比
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function diffClass(current: number | undefined, baseline: number | undefined): string {
  if (current === undefined || baseline === undefined) return "text-muted-foreground";
  const diff = current - baseline;
  if (diff > 0.01) return "text-green-600 font-medium";
  if (diff < -0.01) return "text-red-500 font-medium";
  return "text-muted-foreground";
}

/** 差异行：展示单指标与基准的差异 */
function DiffRow({ label, current, baseline }: { label: string; current?: number; baseline?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{label}差异：</span>
      <span className={diffClass(current, baseline)}>
        {current !== undefined && baseline !== undefined
          ? (current - baseline).toFixed(4)
          : "-"}
      </span>
    </div>
  );
}
