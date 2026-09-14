"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";

// ECharts 懒加载（SELFLOOP3 loop-332，工单 0462/0463）：全量 ECharts 不进首屏
// 关键 bundle；加载期同高度占位防布局跳动（对齐 agg-web ForceGraph2D 先例）。
const ReactECharts = dynamic(
  () =>
    // echarts 按需注册（SELFLOOP3 loop-347，工单 0492/0493）：echarts-for-react 默认
    // importStar 全量包不可摇；core + 本页所需（bar/line/pie + 网格/提示/图例/画布）。
    Promise.all([
      import("echarts-for-react/lib/core"),
      import("echarts/core"),
      import("echarts/charts"),
      import("echarts/components"),
      import("echarts/renderers"),
    ]).then(([reactMod, echarts, charts, components, renderers]) => {
      echarts.use([
        charts.BarChart,
        charts.LineChart,
        charts.PieChart,
        components.GridComponent,
        components.TooltipComponent,
        components.LegendComponent,
        renderers.CanvasRenderer,
      ]);
      return reactMod;
    }),
  {
    ssr: false,
    loading: () => <div className="h-[280px] animate-pulse rounded-md bg-muted/40" />,
  }
);
import {
  dashboardApi,
  evalApi,
  type Overview,
  type TrendItem,
  type BranchItem,
  type ToolItem,
  type ErrorItem,
  type QualityOverview,
} from "@/lib/api";
import { EmptyState } from "@/components/state/empty-state";
import { LoadingState } from "@/components/state/loading-state";

export default function DashboardPage() {
  const [days, setDays] = useState("1");
  const queryClient = useQueryClient();

  // AUTOLOOP al-28 / 工单 1028：overview/trend 试点键化（TanStack Query），
  // 其余四个查询仍走 loadRest（渐进批次见 docs/05 评估 §5）
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview", days],
    queryFn: () => dashboardApi.overview(parseInt(days)).catch(() => null),
  });
  const trendQuery = useQuery({
    queryKey: ["dashboard", "trend", days],
    queryFn: () =>
      dashboardApi
        .trend(parseInt(days), parseInt(days) <= 1 ? "hour" : "day")
        .catch(() => [] as TrendItem[]),
  });
  const overview = overviewQuery.data ?? null;
  const trend = trendQuery.data ?? [];

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [quality, setQuality] = useState<QualityOverview | null>(null);
  const [restLoading, setRestLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadRest = useCallback(async () => {
    setRestLoading(true);
    try {
      const d = parseInt(days);
      const [br, tl, er, ql] = await Promise.all([
        dashboardApi.branchDistribution(d).catch(() => []),
        dashboardApi.toolUsage(d).catch(() => []),
        dashboardApi.errorRanking(d).catch(() => []),
        evalApi.qualityOverview().catch(() => null),
      ]);
      setBranches(br);
      setTools(tl);
      setErrors(er);
      if (ql) setQuality(ql);
    } finally {
      setRestLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void Promise.resolve().then(loadRest);
  }, [loadRest]);

  const loading = overviewQuery.isLoading || trendQuery.isLoading || restLoading;

  /** 一键生成示例评测数据；完成后精确失效全部 dashboard 键 */
  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      await evalApi.seedEval(3, 18);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["dashboard"] }), loadRest()]);
    } catch {
      // 种子接口失败时静默，用户可重试
    } finally {
      setSeeding(false);
    }
  }, [loadRest, queryClient]);

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
      {
        name: "失败数",
        type: "bar",
        data: trend.map((t) => t.fail_count),
        itemStyle: { color: "#ef4444" },
      },
    ],
  };

  const branchOption = {
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        data: branches.map((b) => ({ name: b.branch_type, value: b.count })),
        label: { show: true, formatter: "{b}: {c}" },
      },
    ],
  };

  const toolOption = {
    tooltip: { trigger: "axis" },
    grid: { left: 120, right: 30, bottom: 30, top: 20 },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: tools.map((t) => t.tool_name) },
    series: [{ name: "调用次数", type: "bar", data: tools.map((t) => t.call_count) }],
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
        <StatCard
          title="成功率"
          value={overview?.successRate != null ? `${overview.successRate}%` : "-"}
          loading={loading}
        />
        <StatCard
          title="平均耗时"
          value={overview?.avgCostTimeMs != null ? `${overview.avgCostTimeMs}ms` : "-"}
          loading={loading}
        />
        <StatCard
          title="空检索率"
          value={overview?.emptyRetrievalRate != null ? `${overview.emptyRetrievalRate}%` : "-"}
          loading={loading}
        />
        <StatCard
          title="失败率"
          value={overview?.failRate != null ? `${overview.failRate}%` : "-"}
          loading={loading}
          color="text-red-500"
        />
      </div>

      {/* RAG 质量概览（暂不显示）
      <QualityOverviewCard quality={quality} loading={loading} seeding={seeding} onSeed={handleSeed} />
      */}

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">请求趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length > 0 ? (
            <ReactECharts option={trendOption} style={{ height: 300 }} />
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              {loading ? <LoadingState className="py-0" /> : <EmptyState className="py-0" />}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Branch Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">分支类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            {branches.length > 0 ? (
              <ReactECharts option={branchOption} style={{ height: 280 }} />
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                {loading ? <LoadingState className="py-0" /> : <EmptyState className="py-0" />}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tool Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">工具使用统计</CardTitle>
          </CardHeader>
          <CardContent>
            {tools.length > 0 ? (
              <ReactECharts option={toolOption} style={{ height: 280 }} />
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                {loading ? <LoadingState className="py-0" /> : <EmptyState className="py-0" />}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">错误排行</CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length > 0 ? (
            <div className="space-y-2">
              {errors.slice(0, 10).map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm py-2 border-b last:border-0"
                >
                  <span className="w-6 text-center font-mono text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate text-red-600">{e.error_message || "-"}</span>
                  <span className="text-muted-foreground">{e.agent_id || ""}</span>
                  <span className="font-mono">{e.count}次</span>
                </div>
              ))}
            </div>
          ) : loading ? (
            <LoadingState className="py-8" />
          ) : (
            <EmptyState text="暂无错误" className="py-8" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
  color,
}: {
  title: string;
  value: string | number;
  loading: boolean;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className={`text-2xl font-bold ${color ?? ""}`}>{loading ? "..." : value}</p>
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

function QualityOverviewCard({
  quality,
  loading,
  seeding,
  onSeed,
}: {
  quality: QualityOverview | null;
  loading: boolean;
  seeding: boolean;
  onSeed: () => void;
}) {
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
          <div className="h-24 flex items-center justify-center">
            <LoadingState className="py-0" />
          </div>
        ) : !hasData ? (
          <div className="h-24 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
            <span>暂无评测数据</span>
            <button
              onClick={onSeed}
              disabled={seeding}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {seeding ? "生成中..." : "生成示例评测数据"}
            </button>
          </div>
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
