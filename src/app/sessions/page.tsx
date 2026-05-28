"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryApi, type AgentDecision } from "@/lib/api";

export default function SessionsPage() {
  const [sessionId, setSessionId] = useState("");
  const [results, setResults] = useState<AgentDecision[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!sessionId.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await queryApi.bySession(sessionId.trim());
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">会话维度查询</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              placeholder="输入 SessionID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="max-w-md"
            />
            <Button onClick={search} disabled={!sessionId.trim()}>
              查询
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">加载中...</div>
      ) : searched ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              会话 {sessionId} 的 Trace 记录（{results.length} 条）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">未找到记录</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">TraceID</th>
                    <th className="py-2 pr-4">Agent</th>
                    <th className="py-2 pr-4">意图</th>
                    <th className="py-2 pr-4">状态</th>
                    <th className="py-2 pr-4">耗时</th>
                    <th className="py-2">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4">
                        <Link href={`/traces/${r.traceId}`} className="text-blue-600 hover:underline font-mono text-xs">
                          {r.traceId?.slice(0, 12)}...
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{r.agentId}</td>
                      <td className="py-2 pr-4">{r.intentType}</td>
                      <td className="py-2 pr-4">
                        <span className={r.agentStatus === "SUCCESS" ? "text-green-600" : "text-red-500"}>
                          {r.agentStatus}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono">{r.costTimeMs}ms</td>
                      <td className="py-2 text-xs text-muted-foreground">{r.createTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
