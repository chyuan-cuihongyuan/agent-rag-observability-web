"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryApi, type AgentDecision } from "@/lib/api";

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [traces, setTraces] = useState<AgentDecision[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTraces = useCallback(async () => {
    setLoading(true);
    try {
      const data = await queryApi.bySession(decodeURIComponent(sessionId));
      setTraces(data || []);
    } catch {
      setTraces([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      void Promise.resolve().then(loadTraces);
    }
  }, [sessionId, loadTraces]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">会话详情</h1>
        <span className="font-mono text-sm text-muted-foreground">{sessionId}</span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">加载中...</div>
      ) : traces.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">未找到记录</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">会话 Trace 列表（{traces.length} 条）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {traces.map((t, i) => (
                <Link
                  key={i}
                  href={`/traces/${t.traceId}`}
                  className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-mono text-blue-600">{t.traceId}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.agentId} · {t.intentType || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${t.agentStatus === "SUCCESS" ? "text-green-600" : "text-red-500"}`}>
                        {t.agentStatus}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.costTimeMs}ms · {t.createTime}</p>
                    </div>
                  </div>
                  {t.userQuery && (
                    <p className="mt-2 text-sm text-muted-foreground truncate">{t.userQuery}</p>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
