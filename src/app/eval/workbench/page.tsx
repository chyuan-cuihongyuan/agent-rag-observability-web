"use client";

/**
 * 评测工作台（工单 0140 T1）— 五区块布局：
 * ①三池与版本管理（golden/challenge/wrong 池 tab + 版本列表 + 复制新版本/冻结）
 * ②Case 池（候选列表/来源筛选/上下文快照/批量回填错题集/忽略/归因标注）
 * ③归因视图（四分层分布环形图 + 时间窗筛选）
 * ④门禁结果（最新 backtest PASS/BLOCK 横幅 + 触发规则明细 + 历史列表）
 * ⑤巡检状态（最近一轮汇总 + 最近失败 + 手动拨测）
 */

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  caseApi,
  evalApi,
  gateApi,
  patrolApi,
  type AttributionStatRow,
  type CaseCandidate,
  type EvalDatasetDetail,
  type GateRecord,
  type GateRule,
  type PatrolRecord,
  type PatrolRoundSummary,
} from "@/lib/api";

const POOLS = ["golden", "challenge", "wrong"] as const;
const POOL_LABELS: Record<string, string> = {
  golden: "黄金集",
  challenge: "挑战集",
  wrong: "错题集",
};
const SOURCES = ["", "EVAL_LOW_SCORE", "TRACE_FAIL", "PATROL_FAIL"] as const;
const SOURCE_LABELS: Record<string, string> = {
  "": "全部来源",
  EVAL_LOW_SCORE: "低分评测",
  TRACE_FAIL: "失败链路",
  PATROL_FAIL: "巡检失败",
};
const ATTRIBUTIONS = ["PLANNING", "TOOL", "ENVIRONMENT", "SKILL"] as const;
const ATTRIBUTION_LABELS: Record<string, string> = {
  PLANNING: "规划错",
  TOOL: "工具错",
  ENVIRONMENT: "环境错",
  SKILL: "知识错",
};

export default function EvalWorkbenchPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">评测工作台</h1>
      <Tabs defaultValue="pools" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pools">三池与版本</TabsTrigger>
          <TabsTrigger value="cases">Case 池</TabsTrigger>
          <TabsTrigger value="attribution">归因视图</TabsTrigger>
          <TabsTrigger value="gates">门禁结果</TabsTrigger>
          <TabsTrigger value="patrol">巡检状态</TabsTrigger>
        </TabsList>
        <TabsContent value="pools">
          <PoolsPanel />
        </TabsContent>
        <TabsContent value="cases">
          <CasePoolPanel />
        </TabsContent>
        <TabsContent value="attribution">
          <AttributionPanel />
        </TabsContent>
        <TabsContent value="gates">
          <GatePanel />
        </TabsContent>
        <TabsContent value="patrol">
          <PatrolPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** ①三池与版本管理 */
function PoolsPanel() {
  const [pool, setPool] = useState<string>("golden");
  const [datasets, setDatasets] = useState<EvalDatasetDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<EvalDatasetDetail[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await evalApi.listDatasetsByPool(pool).catch(() => ({ list: [] }));
      setDatasets(res?.list ?? []);
    } finally {
      setLoading(false);
    }
  }, [pool]);

  useEffect(() => {
    load();
  }, [load]);

  async function showVersions(datasetId: string) {
    const res = await evalApi.listDatasetVersions(datasetId).catch(() => ({ list: [] }));
    setVersions(res?.list ?? []);
  }

  async function copyVersion(datasetId: string) {
    await evalApi.copyDatasetVersion(datasetId);
    await load();
    await showVersions(datasetId);
  }

  async function toggleFreeze(row: EvalDatasetDetail) {
    await evalApi.freezeDataset(row.datasetId, !row.frozen);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {POOLS.map((p) => (
          <Button key={p} variant={pool === p ? "default" : "outline"} size="sm" onClick={() => setPool(p)}>
            {POOL_LABELS[p]}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{POOL_LABELS[pool]}列表</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>
          ) : datasets.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground text-sm">该池暂无数据集</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">名称</th>
                  <th className="py-2">版本</th>
                  <th className="py-2">条目数</th>
                  <th className="py-2">来源</th>
                  <th className="py-2">状态</th>
                  <th className="py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.datasetId} className="border-b last:border-0">
                    <td className="py-2">{d.datasetName}</td>
                    <td className="py-2 font-mono">v{d.version ?? "-"}</td>
                    <td className="py-2 font-mono">{d.itemCount}</td>
                    <td className="py-2 text-muted-foreground">{d.source ?? "-"}</td>
                    <td className="py-2">
                      {d.frozen ? <Badge variant="destructive">已冻结</Badge> : <Badge variant="secondary">可编辑</Badge>}
                    </td>
                    <td className="py-2 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => showVersions(d.datasetId)}>
                        版本
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyVersion(d.datasetId)}>
                        复制新版本
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleFreeze(d)}>
                        {d.frozen ? "解冻" : "冻结"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      {versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">版本历史（{versions[0]?.datasetName}）</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">版本</th>
                  <th className="py-2">条目数</th>
                  <th className="py-2">冻结</th>
                  <th className="py-2">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.datasetId} className="border-b last:border-0">
                    <td className="py-2 font-mono">v{v.version ?? "-"}</td>
                    <td className="py-2 font-mono">{v.itemCount}</td>
                    <td className="py-2">{v.frozen ? "已冻结" : "可编辑"}</td>
                    <td className="py-2 text-xs text-muted-foreground">{v.createTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** ②Case 池 */
function CasePoolPanel() {
  const [source, setSource] = useState<string>("");
  const [candidates, setCandidates] = useState<CaseCandidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await caseApi.candidates(source).catch(() => []);
      setCandidates(res ?? []);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function promote() {
    const res = await caseApi.promote([...selected]);
    setMessage(`已回填 ${res?.promoted ?? 0} 条到错题集`);
    setSelected(new Set());
    await load();
  }

  async function ignore() {
    const res = await caseApi.ignore([...selected]);
    setMessage(`已忽略 ${res?.ignored ?? 0} 条`);
    setSelected(new Set());
    await load();
  }

  async function attribute(id: number, attribution: string) {
    await caseApi.attribute(id, attribution, "工作台标注");
    await load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Case 候选池</CardTitle>
        <div className="flex gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={promote} disabled={selected.size === 0}>
            批量回填错题集
          </Button>
          <Button size="sm" variant="outline" onClick={ignore} disabled={selected.size === 0}>
            忽略
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {message && <div className="mb-2 text-sm text-green-600">{message}</div>}
        {loading ? (
          <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>
        ) : candidates.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-sm">暂无候选（可点击「手动采集」或等待自动挖掘）</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 w-8"></th>
                <th className="py-2">来源</th>
                <th className="py-2">查询</th>
                <th className="py-2">原因</th>
                <th className="py-2">状态</th>
                <th className="py-2">归因</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-b last:border-0 align-top">
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      disabled={c.status !== "PENDING"}
                    />
                  </td>
                  <td className="py-2">{SOURCE_LABELS[c.source] ?? c.source}</td>
                  <td className="py-2 max-w-[240px] truncate" title={c.query}>
                    {c.query}
                  </td>
                  <td className="py-2 max-w-[200px] truncate text-muted-foreground" title={c.reason}>
                    {c.reason}
                  </td>
                  <td className="py-2">
                    {c.status === "PENDING" ? (
                      <Badge variant="secondary">待处置</Badge>
                    ) : c.status === "PROMOTED" ? (
                      <Badge>已回填</Badge>
                    ) : (
                      <Badge variant="outline">已忽略</Badge>
                    )}
                  </td>
                  <td className="py-2">
                    {c.attribution ? (
                      <span className="text-xs">{ATTRIBUTION_LABELS[c.attribution] ?? c.attribution}</span>
                    ) : (
                      <select
                        className="border rounded px-1 py-0.5 text-xs"
                        value=""
                        onChange={(e) => attribute(c.id, e.target.value)}
                      >
                        <option value="">标注...</option>
                        {ATTRIBUTIONS.map((a) => (
                          <option key={a} value={a}>
                            {ATTRIBUTION_LABELS[a]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-2">
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                      {expanded === c.id ? "收起" : "快照"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {expanded !== null && (
          <div className="mt-2 rounded border p-3 text-xs space-y-1 bg-muted/30">
            {candidates
              .filter((c) => c.id === expanded)
              .map((c) => (
                <div key={c.id} className="space-y-1">
                  <div>
                    <b>traceId:</b> {c.traceId ?? "-"}
                  </div>
                  <div>
                    <b>答案摘要:</b> {c.answerSummary ?? "-"}
                  </div>
                  <div>
                    <b>命中文档数:</b> {c.hitDocCount ?? "-"}；<b>工具:</b> {c.toolList ?? "-"}
                  </div>
                  <div>
                    <b>来源引用:</b> {c.sourceRef}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** ③归因视图 */
function AttributionPanel() {
  const [rows, setRows] = useState<AttributionStatRow[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await caseApi.attributionStats(startTime, endTime).catch(() => []);
      setRows(res ?? []);
    } finally {
      setLoading(false);
    }
  }, [startTime, endTime]);

  useEffect(() => {
    load();
  }, [load]);

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">归因分布（四分层）</CardTitle>
        <div className="flex gap-2 items-center">
          <Input
            className="w-44"
            placeholder="开始时间 yyyy-MM-dd HH:mm:ss"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            className="w-44"
            placeholder="结束时间 yyyy-MM-dd HH:mm:ss"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={load}>
            查询
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>
        ) : total === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-sm">暂无已标注 Case</div>
        ) : (
          <div className="flex items-center gap-8">
            {/* 纯 CSS 环形图（四分层分布，ECharts 见仪表盘页；此处零依赖即时渲染） */}
            <div
              className="w-44 h-44 rounded-full relative"
              style={{ background: conicGradient(rows) }}
            >
              <div className="absolute inset-8 rounded-full bg-background flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{total}</span>
                <span className="text-xs text-muted-foreground">已标注</span>
              </div>
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.attribution} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: ATTR_COLORS[r.attribution] ?? "#94a3b8" }}
                  />
                  <span className="w-20">{ATTRIBUTION_LABELS[r.attribution] ?? r.attribution}</span>
                  <span className="font-mono">{r.count}</span>
                  <span className="text-muted-foreground">({(r.ratio * 100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const ATTR_COLORS: Record<string, string> = {
  PLANNING: "#6366f1",
  TOOL: "#f59e0b",
  ENVIRONMENT: "#94a3b8",
  SKILL: "#10b981",
};

function conicGradient(rows: AttributionStatRow[]): string {
  let acc = 0;
  const parts: string[] = [];
  for (const r of rows) {
    if (r.count <= 0) continue;
    const start = (acc * 100).toFixed(2);
    acc += r.ratio;
    const end = (acc * 100).toFixed(2);
    parts.push(`${ATTR_COLORS[r.attribution] ?? "#94a3b8"} ${start}% ${end}%`);
  }
  return parts.length > 0 ? `conic-gradient(${parts.join(", ")})` : "transparent";
}

/** ④门禁结果 */
function GatePanel() {
  const [gates, setGates] = useState<GateRule[]>([]);
  const [latest, setLatest] = useState<GateRecord | null>(null);
  const [records, setRecords] = useState<GateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const listRes = await gateApi.list().catch(() => ({ list: [] }));
        const gateList = listRes?.list ?? [];
        setGates(gateList);
        if (gateList.length > 0) {
          const first = gateList[0];
          const [latestRes, recordsRes] = await Promise.all([
            gateApi.latestRecord(first.gateId).catch(() => null),
            gateApi.recordList(first.gateId).catch(() => ({ list: [] })),
          ]);
          setLatest(latestRes);
          setRecords(recordsRes?.list ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>
      ) : (
        <>
          {latest && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Badge variant={latest.result === "PASS" ? "default" : "destructive"} className="text-sm px-3 py-1">
                    {latest.result === "PASS" ? "PASS 放行" : "BLOCK 拦截"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    门禁 {latest.gateId} · 回测任务 {latest.taskId} · {latest.createTime}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">门禁规则（{gates.length}）</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">名称</th>
                    <th className="py-2">trials</th>
                    <th className="py-2">安全维度</th>
                    <th className="py-2">分数阈值</th>
                    <th className="py-2">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {gates.map((g) => (
                    <tr key={g.gateId} className="border-b last:border-0">
                      <td className="py-2">{g.name}</td>
                      <td className="py-2 font-mono">{g.trials ?? 1}</td>
                      <td className="py-2 text-xs font-mono max-w-[220px] truncate" title={g.safetyDimsJson}>
                        {g.safetyDimsJson ?? "-"}
                      </td>
                      <td className="py-2 text-xs font-mono max-w-[220px] truncate" title={g.scoreThresholdsJson}>
                        {g.scoreThresholdsJson ?? "-"}
                      </td>
                      <td className="py-2">
                        {g.enabled === 1 || g.enabled === true ? (
                          <Badge>启用</Badge>
                        ) : (
                          <Badge variant="outline">停用</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">判定历史</CardTitle>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-sm">暂无判定记录</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2">结论</th>
                      <th className="py-2">任务</th>
                      <th className="py-2">触发明细</th>
                      <th className="py-2">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.recordId} className="border-b last:border-0">
                        <td className="py-2">
                          <Badge variant={r.result === "PASS" ? "default" : "destructive"}>{r.result}</Badge>
                        </td>
                        <td className="py-2 font-mono text-xs">{r.taskId}</td>
                        <td className="py-2 text-xs max-w-[420px] truncate" title={r.triggerDetail}>
                          {r.triggerDetail ?? "-"}
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">{r.createTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/** ⑤巡检状态 */
function PatrolPanel() {
  const [summary, setSummary] = useState<PatrolRoundSummary | null>(null);
  const [records, setRecords] = useState<PatrolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const load = useCallback(async () => {
    try {
      const [latest, records] = await Promise.all([
        patrolApi.latest().catch(() => null),
        patrolApi.records(1, 10).catch(() => []),
      ]);
      setSummary(latest);
      setRecords(records ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function trigger() {
    setTriggering(true);
    try {
      await patrolApi.trigger();
      await load();
    } finally {
      setTriggering(false);
    }
  }

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>;
  }

  const neverRan = !summary || !summary.roundId;
  const recentFailures = records.filter((r) => r.status !== "SUCCESS").slice(0, 3);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">最近一轮巡检</CardTitle>
          <Button size="sm" onClick={trigger} disabled={triggering}>
            {triggering ? "拨测中..." : "手动拨测"}
          </Button>
        </CardHeader>
        <CardContent>
          {neverRan ? (
            <div className="py-4 text-center text-muted-foreground text-sm">从未巡检（patrol.enabled 默认关，可手动触发一轮）</div>
          ) : (
            <div className="grid grid-cols-5 gap-4 text-center">
              <StatCard label="总数" value={summary!.total} />
              <StatCard label="成功" value={summary!.success} tone="text-green-600" />
              <StatCard label="失败" value={summary!.fail} tone="text-red-600" />
              <StatCard label="超时" value={summary!.timeout} tone="text-amber-600" />
              <StatCard label="平均分" value={summary!.avgScore != null ? summary!.avgScore.toFixed(3) : "-"} />
            </div>
          )}
          {summary?.finishedAt && (
            <div className="mt-3 text-xs text-muted-foreground">轮次 {summary.roundId} · {summary.finishedAt}</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近拨测记录</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground text-sm">暂无记录</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">状态</th>
                  <th className="py-2">查询</th>
                  <th className="py-2">分数</th>
                  <th className="py-2">耗时</th>
                  <th className="py-2">时间</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Badge variant={r.status === "SUCCESS" ? "default" : "destructive"}>{r.status}</Badge>
                    </td>
                    <td className="py-2 max-w-[260px] truncate" title={r.query}>
                      {r.query}
                    </td>
                    <td className="py-2 font-mono">{r.score != null ? r.score.toFixed(3) : "-"}</td>
                    <td className="py-2 font-mono">{r.durationMs}ms</td>
                    <td className="py-2 text-xs text-muted-foreground">{r.createTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {recentFailures.length > 0 && (
            <div className="mt-3 text-xs text-red-600">
              最近失败 {recentFailures.length} 条：{recentFailures.map((f) => f.taskRef).join("、")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded border p-3">
      <div className={`text-xl font-bold ${tone ?? ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
