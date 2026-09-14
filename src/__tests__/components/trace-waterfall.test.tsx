/**
 * TraceWaterfall 全链路瀑布图渲染契约测试（工单 1141）：
 * 空数据不渲染、阶段行组装（Agent 决策/RAG/工具/LLM 生成）、错误工具标记、总耗时徽章。
 */
import { render, screen } from "@testing-library/react";
import { TraceWaterfall } from "@/components/trace/TraceWaterfall";
import type { FullTrace, ToolCallLog } from "@/lib/api";

const emptyTrace: FullTrace = {
  traceId: "t-1",
  sessionId: "s-1",
  ownerUserId: "u-1",
  agentId: "a-1",
  sourceService: "agg",
  createTime: "2026-09-14 00:00:00",
  agentDecision: null,
  ragRetrieval: null,
  chatResult: null,
  toolCalls: null,
  memoryRecalls: null,
};

const fullTrace: FullTrace = {
  ...emptyTrace,
  agentDecision: { costTimeMs: 120, branchType: "tool", intentType: "查询" },
  ragRetrieval: {
    retrievalStages: JSON.stringify([
      { stage: "query_rewrite", costTimeMs: 30 },
      { stage: "vector", costTimeMs: 90, count: 5 },
    ]),
  },
  chatResult: {
    totalCostTimeMs: 900,
    promptTokens: 100,
    completionTokens: 50,
    modelVersion: "glm-test",
  },
  toolCalls: [
    {
      toolName: "queryLogs",
      toolInput: "level=ERROR",
      status: "SUCCESS",
      costTimeMs: 200,
    },
    {
      toolName: "callOps",
      toolInput: "action=restart",
      status: "FAILURE",
      costTimeMs: 40,
    },
  ],
} as unknown as FullTrace;

describe("TraceWaterfall 渲染契约", () => {
  it("无任何阶段数据时不渲染", () => {
    const { container } = render(<TraceWaterfall trace={emptyTrace} />);
    expect(container.firstChild).toBeNull();
  });

  it("渲染标题与总耗时徽章", () => {
    render(<TraceWaterfall trace={fullTrace} />);
    expect(screen.getByText("全链路瀑布图")).toBeInTheDocument();
    expect(screen.getByText(/总耗时/)).toBeInTheDocument();
  });

  it("Agent 决策 / 检索阶段 / LLM 生成各占一行", () => {
    render(<TraceWaterfall trace={fullTrace} />);
    expect(screen.getByText("Agent 决策")).toBeInTheDocument();
    expect(screen.getByText("Query 改写")).toBeInTheDocument();
    expect(screen.getByText("向量检索")).toBeInTheDocument();
    expect(screen.getByText("LLM 生成")).toBeInTheDocument();
    // 分支/意图详情拼接
    expect(screen.getByText("tool / 查询")).toBeInTheDocument();
  });

  it("工具调用按名称成行，成功/失败以图标区分", () => {
    render(<TraceWaterfall trace={fullTrace} />);
    expect(screen.getByText(/queryLogs/)).toBeInTheDocument();
    expect(screen.getByText(/callOps/)).toBeInTheDocument();
    expect(screen.getByText(/✅ level=ERROR/)).toBeInTheDocument();
    expect(screen.getByText(/❌ action=restart/)).toBeInTheDocument();
  });

  it("retrievalStages 非法 JSON 时跳过该阶段且不崩溃", () => {
    const broken: FullTrace = {
      ...fullTrace,
      ragRetrieval: {
        ...(fullTrace.ragRetrieval as NonNullable<FullTrace["ragRetrieval"]>),
        retrievalStages: "{not-json",
      },
    } as FullTrace;
    render(<TraceWaterfall trace={broken} />);
    expect(screen.getByText("全链路瀑布图")).toBeInTheDocument();
    expect(screen.queryByText("Query 改写")).not.toBeInTheDocument();
  });

  it("毫秒格式化：<1ms 与秒级", () => {
    const tiny: FullTrace = {
      ...emptyTrace,
      chatResult: { totalCostTimeMs: 0.4 } as FullTrace["chatResult"],
    } as FullTrace;
    render(<TraceWaterfall trace={tiny} />);
    expect(screen.getByText("<1ms")).toBeInTheDocument();
  });
});
