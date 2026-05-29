"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryApi, type FullTrace } from "@/lib/api";

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

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <InfoItem label="SessionID" value={trace.sessionId} mono />
            <InfoItem label="UserID" value={trace.ownerUserId} mono />
            <InfoItem label="来源服务" value={trace.sourceService} />
            <InfoItem label="创建时间" value={trace.createTime} />
          </div>
        </CardContent>
      </Card>

      {/* Three sections: Agent Decision, RAG Retrieval, Chat Result */}
      <div className="grid grid-cols-1 gap-4">
        <SectionCard title="Agent 决策" data={trace.agentDecision} />
        <SectionCard title="RAG 检索" data={trace.ragRetrieval} />
        <SectionCard title="问答结果" data={trace.chatResult} />
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? "font-mono text-xs" : ""}>{value || "-"}</p>
    </div>
  );
}

function SectionCard({ title, data }: { title: string; data: Record<string, unknown> | null }) {
  if (!data) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
          {Object.entries(data).map(([key, val]) => (
            <div key={key}>
              <p className="text-xs text-muted-foreground">{key}</p>
              <ValueDisplay value={val} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ValueDisplay({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p className="text-sm">-</p>;
  if (typeof value === "boolean") return <Badge variant={value ? "default" : "secondary"}>{String(value)}</Badge>;
  if (typeof value === "number") return <p className="text-sm font-mono">{value}</p>;
  if (typeof value === "object") return <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">{JSON.stringify(value, null, 2)}</pre>;
  const str = String(value);
  if (str.length > 200) return <p className="text-sm" title={str}>{str.slice(0, 200)}...</p>;
  return <p className="text-sm">{str}</p>;
}
