"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@chyuan/ui-kit";
import { Tabs, TabsList, TabsTrigger } from "@chyuan/ui-kit";
import ReactECharts from "echarts-for-react";
import { dashboardApi, type Overview, type TrendItem, type BranchItem, type ToolItem, type ErrorItem } from "@chyuan/ui-kit";

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [days, setDays] = useState("1");
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const d = parseInt(days);
      const [ov, tr, br, tl, er] = await Promise.all([
        dashboardApi.overview(d).catch(() => null),
        dashboardApi.trend(d, d <= 1 ? "hour" : "day").catch(() => []),
        dashboardApi.branchDistribution(d).catch(() => []),
        dashboardApi.toolUsage(d).catch(() => []),
        dashboardApi.errorRanking(d).catch(() => []),
      ]);
      if (ov) setOverview(ov);
      setTrend(tr);
      setBranches(br);
      setTools(tl);
      setErrors(er);
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
