"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactECharts from "echarts-for-react";
import { dashboardApi, evalApi, type Overview, type TrendItem, type BranchItem, type ToolItem, type ErrorItem, type QualityOverview } from "@/lib/api";

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [quality, setQuality] = useState<QualityOverview | null>(null);
  const [days, setDays] = useState("1");
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const d = parseInt(days);
      const [ov, tr, br, tl, er, ql] = await Promise.all([
        dashboardApi.overview(d).catch(() => null),
        dashboardApi.trend(d, d <= 1 ? "hour" : "day").catch(() => []),
        dashboardApi.branchDistribution(d).catch(() => []),
        dashboardApi.toolUsage(d).catch(() => []),
        dashboardApi.errorRanking(d).catch(() => []),
        evalApi.qualityOverview().catch(() => null),
      ]);
      if (ov) setOverview(ov);
      setTrend(tr);
      setBranches(br);
      setTools(tl);
      setErrors(er);
      if (ql) setQuality(ql);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void Promise.resolve().then(loadAll);
  }, [loadAll]);

  const trendOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["请求数", "平均耗时(ms)", "失败数"] },
    grid: { left: 60, right: 30, bottom: 30, top: 40 },
    xAxis: { type: "category", data: trend.map((t) => t.time_bucket) },
    yAxis: [
      { type: "value", name: "请求数" },
      { type: "value", name: "耗时(ms)" },
    ],
    series: [
      { name: "请求数", type: "bar", data: trend.map((t) => t.request_count) },
      { name: "平均耗时(ms)", type: "line", yAxisIndex: 1, data: trend.map((t) => t.avg_cost_ms) },
      { name: "失败数", type: "bar", data: trend.map((t) => t.fail_count), itemStyle: { color: "#ef4444" } },
    ],
  };

  const branchOption = {
    tooltip: { trigger: "item" },
    series: [{
      type: "pie",
      radius: ["40%", "70%"],
      data: branches.map((b) => ({ name: b.branch_type, value: b.count })),
      label: { show: true, formatter: "{b}: {c}" },
    }],
  };

  const toolOption = {
    tooltip: { trigger: "axis" },
    grid: { left: 120, right: 30, bottom: 30, top: 20 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: tools.map((t) => t.tool_name) },
    series: [
      { name: "调用次数", type: "bar", data: tools.map((t) => t.call_count) },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <Tabs value={days} onValueChange={setDays}>
          <TabsList>
            <TabsTrigger value="1">今日</TabsTrigger>
            <TabsTrigger value="3">3天</TabsTrigger>
            <TabsTrigger value="7">7天</TabsTrigger>
            <TabsTrigger value="30">30天</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard title="总请求数" value={overview?.totalRequests ?? 0} loading={loading} />
        <StatCard title="成功率" value={overview?.successRate != null ? `${overview.successRate}%` : "-"} loading={loading} />
        <StatCard title="平均耗时" value={overview?.avgCostTimeMs != null ? `${overview.avgCostTimeMs}ms` : "-"} loading={loading} />
        <StatCard title="空检索率" value={overview?.emptyRetrievalRate != null ? `${overview.emptyRetrievalRate}%` : "-"} loading={loading} />
        <StatCard title="失败率" value={overview?.failRate != null ? `${overview.failRate}%` : "-"} loading={loading} color="text-red-500" />
      </div>

      {/* RAG 质量概览 */}
      <QualityOverviewCard quality={quality} loading={loading} />

      {/* Trend Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">请求趋势</CardTitle></CardHeader>
        <CardContent>
          {trend.length > 0 ? (
            <ReactECharts option={trendOption} style={{ height: 300 }} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
              {loading ? "加载中..." : "暂无数据"}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Branch Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">分支类型分布</CardTitle></CardHeader>
          <CardContent>
            {branches.length > 0 ? (
              <ReactECharts option={branchOption} style={{ height: 280 }} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                {loading ? "加载中..." : "暂无数据"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tool Usage */}
        <Card>
          <CardHeader><CardTitle className="text-base">工具使用统计</CardTitle></CardHeader>
          <CardContent>
            {tools.length > 0 ? (
              <ReactECharts option={toolOption} style={{ height: 280 }} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                {loading ? "加载中..." : "暂无数据"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Ranking */}
      <Card>
        <CardHeader><CardTitle className="text-base">错误排行</CardTitle></CardHeader>
        <CardContent>
          {errors.length > 0 ? (
            <div className="space-y-2">
              {errors.slice(0, 10).map((e, i) => (
                <div key={i} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                  <span className="w-6 text-center font-mono text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate text-red-600">{e.error_message || "-"}</span>
                  <span className="text-muted-foreground">{e.agent_id || ""}</span>
                  <span className="font-mono">{e.count}次</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {loading ? "加载中..." : "暂无错误"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, loading, color }: { title: string; value: string | number; loading: boolean; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className={`text-2xl font-bold ${color ?? ""}`}>
          {loading ? "..." : value}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * 将评分格式化为百分比或保留小数。
 * RAG 指标（MRR/NDCG/Recall/Precision）通常为 0~1，按百分比展示；
 * 若数值 > 1（如 0~100 量纲）则直接展示并保留一位小数。
 */
function fmtScore(v?: number): string {
  if (v == null || Number.isNaN(v)) return "-";
  if (v <= 1) return `${(v * 100).toFixed(1)}%`;
  return v.toFixed(1);
}

/**
 * 根据分值返回颜色：>=80% 绿、>=60% 琥珀、否则红。
 */
function scoreColor(v?: number): string {
  if (v == null) return "";
  const pct = v <= 1 ? v * 100 : v;
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-red-500";
}

function QualityOverviewCard({ quality, loading }: { quality: QualityOverview | null; loading: boolean }) {
  const hasData = !!quality && quality.taskCount > 0;

  const metrics: { label: string; value?: number; hint: string }[] = [
    { label: "综合得分", value: quality?.avgOverallScore, hint: "加权平均" },
    { label: "忠实度", value: quality?.avgFaithfulnessScore, hint: "Faithfulness" },
    { label: "回答正确性", value: quality?.avgAnswerCorrectness, hint: "Correctness" },
    { label: "召回率", value: quality?.avgRecallScore, hint: "Recall" },
    { label: "精确率", value: quality?.avgPrecisionScore, hint: "Precision" },
    { label: "上下文精确率", value: quality?.avgContextPrecision, hint: "Ctx Precision" },
    { label: "上下文召回", value: quality?.avgContextRecall, hint: "Ctx Recall" },
    { label: "上下文相关性", value: quality?.avgContextRelevance, hint: "Ctx Relevance" },
    { label: "MRR", value: quality?.avgMrrScore, hint: "Mean Reciprocal Rank" },
    { label: "NDCG", value: quality?.avgNdcgScore, hint: "Normalized DCG" },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">RAG 质量概览</CardTitle>
        {hasData && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>任务 {quality?.taskCount}</span>
            <span>样本 {quality?.sampleCount}</span>
            {quality?.updateTime && <span>更新于 {quality.updateTime}</span>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">加载中...</div>
        ) : !hasData ? (
          <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">暂无评测数据</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="flex flex-col gap-1" title={m.hint}>
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className={`text-xl font-bold ${scoreColor(m.value)}`}>
                  {fmtScore(m.value)}
                </span>
                <span className="text-[10px] text-muted-foreground/70">{m.hint}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
