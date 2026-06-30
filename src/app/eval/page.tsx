"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { evalApi, type EvalDatasetDetail, type EvalTaskDetail } from "@/lib/api";

export default function EvalPage() {
  const [datasets, setDatasets] = useState<EvalDatasetDetail[]>([]);
  const [tasks, setTasks] = useState<EvalTaskDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [dsRes, taskRes] = await Promise.all([
        evalApi.listDatasets().catch(() => ({ list: [] })),
        evalApi.listTasks().catch(() => ({ list: [], total: 0 })),
      ]);
      setDatasets(dsRes?.list ?? []);
      setTasks(taskRes?.list ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">评测管理</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Dataset Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">评测数据集</CardTitle>
            <CreateDatasetDialog onCreated={loadData} />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>
            ) : datasets.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-sm">暂无数据集</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">名称</th>
                    <th className="py-2">条目数</th>
                    <th className="py-2">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((d) => (
                    <tr key={d.datasetId} className="border-b last:border-0">
                      <td className="py-2">{d.datasetName}</td>
                      <td className="py-2 font-mono">{d.itemCount}</td>
                      <td className="py-2 text-xs text-muted-foreground">{d.createTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Eval Task Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">评测任务</CardTitle>
            <CreateTaskDialog datasets={datasets} onCreated={loadData} />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>
            ) : tasks.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-sm">暂无评测任务</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">任务名称</th>
                    <th className="py-2">评测类型</th>
                    <th className="py-2">状态</th>
                    <th className="py-2">质量摘要</th>
                    <th className="py-2">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.taskId} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                      <td className="py-2">
                        <Link href={`/eval/${t.taskId}`} className="text-blue-600 hover:underline">
                          {t.taskName}
                        </Link>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline">{evalTypeLabel(t.evalType)}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant={t.status === "COMPLETED" ? "default" : t.status === "FAILED" ? "destructive" : "secondary"}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${listScoreColor(t.avgOverallScore)}`}>
                            {t.avgOverallScore != null ? `${(t.avgOverallScore * 100).toFixed(1)}%` : "-"}
                          </span>
                          {t.completedCount != null && t.completedCount > 0 && (
                            <span className="text-xs text-muted-foreground">{t.completedCount} 条</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{t.createTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CreateDatasetDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [items, setItems] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name || !items) return;
    setSubmitting(true);
    try {
      await evalApi.createDataset({
        datasetId: `ds-${Date.now()}`,
        datasetName: name,
        description: desc,
        itemCount: items.split("\n").filter(Boolean).length,
        itemsJson: items,
      });
      setOpen(false);
      setName("");
      setDesc("");
      setItems("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        新建数据集
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建评测数据集</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>数据集名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：退款场景v2" />
          </div>
          <div>
            <Label>描述</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="可选" />
          </div>
          <div>
            <Label>测试条目（每行一条 JSON）</Label>
            <textarea
              className="w-full border rounded-md p-2 text-sm h-40 font-mono"
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder={'{"query":"...","expected":"..."}'}
            />
          </div>
          <Button onClick={submit} disabled={submitting || !name || !items} className="w-full">
            {submitting ? "提交中..." : "创建"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateTaskDialog({ datasets, onCreated }: { datasets: EvalDatasetDetail[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [evalType, setEvalType] = useState("rag");
  const [datasetId, setDatasetId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!taskName || !datasetId) return;
    setSubmitting(true);
    try {
      await evalApi.createTask({ taskName, evalType, datasetId, modelVersion: "", ragStrategyVersion: "" });
      setOpen(false);
      setTaskName("");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        新建任务
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建评测任务</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>任务名称</Label>
            <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="如：退款场景回归测试" />
          </div>
          <div>
            <Label>评测类型</Label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={evalType}
              onChange={(e) => setEvalType(e.target.value)}
            >
              <option value="rag">RAG 准确性</option>
              <option value="agent">Agent 决策质量</option>
              <option value="full">全链路评测</option>
            </select>
          </div>
          <div>
            <Label>关联数据集</Label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
            >
              <option value="">选择数据集</option>
              {datasets.map((d) => (
                <option key={d.datasetId} value={d.datasetId}>{d.datasetName}</option>
              ))}
            </select>
          </div>
          <Button onClick={submit} disabled={submitting || !taskName || !datasetId} className="w-full">
            {submitting ? "提交中..." : "创建"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 评测类型中文标签 */
function evalTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    RAG_RETRIEVAL: "RAG 检索",
    ANSWER_QUALITY: "答案质量",
    CONTEXT_QUALITY: "上下文质量",
    TOOL_CALL: "工具调用",
    AGENT_DECISION: "Agent 决策",
  };
  return (type && map[type]) || type || "-";
}

/** 列表页综合分配色：>=80% 绿、>=60% 琥珀、否则红 */
function listScoreColor(score?: number): string {
  if (score == null) return "text-muted-foreground";
  const pct = score <= 1 ? score * 100 : score;
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-red-500";
}
