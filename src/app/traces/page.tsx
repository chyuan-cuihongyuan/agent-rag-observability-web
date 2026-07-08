"use client";

import {useCallback, useEffect, useState} from "react";
import Link from "next/link";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {queryApi, type TraceListItem} from "@/lib/api";

export default function TracesPage() {
  const [traces, setTraces] = useState<TraceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [traceIdInput, setTraceIdInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [userId, setUserId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [branchType, setBranchType] = useState("");
  const [agentStatus, setAgentStatus] = useState("");

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const result = await queryApi.traceList({
        sessionId: sessionId || undefined,
        ownerUserId: userId || undefined,
        agentId: agentId || undefined,
        branchType: branchType || undefined,
        agentStatus: agentStatus || undefined,
        page,
        size: 20,
      });
      if (result?.list) {
        setTraces(result.list);
        setTotal(result.total ?? 0);
      }
    } catch {
      setTraces([]);
    } finally {
      setLoading(false);
    }
  }, [page, sessionId, userId, agentId, branchType, agentStatus]);

  useEffect(() => {
    void Promise.resolve().then(search);
  }, [search]);

  function goTrace() {
    if (traceIdInput.trim()) {
      window.location.href = `/traces/${traceIdInput.trim()}`;
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Trace 查询</h1>

      {/* Quick search by traceId */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              placeholder="输入 TraceID 直接跳转"
              value={traceIdInput}
              onChange={(e) => setTraceIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goTrace()}
              className="max-w-sm"
            />
            <Button onClick={goTrace} disabled={!traceIdInput.trim()}>
              查看详情
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardHeader><CardTitle className="text-base">筛选条件</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">SessionID</label>
              <Input placeholder="sessionId" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">UserID</label>
              <Input placeholder="userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Agent ID</label>
              <Input placeholder="agentId" value={agentId} onChange={(e) => setAgentId(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">分支类型</label>
              <select
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                value={branchType}
                onChange={(e) => setBranchType(e.target.value)}
              >
                <option value="">全部</option>
                <option value="RAG">RAG</option>
                <option value="DIRECT_ANSWER">直接回答</option>
                <option value="TOOL_CALL">工具调用</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">状态</label>
              <select
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                value={agentStatus}
                onChange={(e) => setAgentStatus(e.target.value)}
              >
                <option value="">全部</option>
                <option value="SUCCESS">成功</option>
                <option value="FAIL">失败</option>
              </select>
            </div>
            <div className="col-span-3">
              <Button onClick={() => { setPage(1); search(); }}>查询</Button>
              <Button
                variant="outline"
                className="ml-2"
                onClick={() => {
                  setSessionId("");
                  setUserId("");
                  setAgentId("");
                  setBranchType("");
                  setAgentStatus("");
                  setPage(1);
                }}
              >
                重置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Trace 列表</CardTitle>
          <span className="text-sm text-muted-foreground">共 {total} 条</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">加载中...</div>
          ) : traces.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">暂无数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">用户问题</th>
                    <th className="py-2 pr-4">TraceID</th>
                    <th className="py-2 pr-4">SessionID</th>
                    <th className="py-2 pr-4">Agent</th>
                    <th className="py-2 pr-4">分支</th>
                    <th className="py-2 pr-4">状态</th>
                    <th className="py-2 pr-4">耗时</th>
                    <th className="py-2 pr-4">来源</th>
                    <th className="py-2">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.map((t, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4 max-w-xs truncate">
                        <Link href={`/traces/${t.traceId}`} className="hover:underline" title={t.userQuery}>
                          {t.userQuery ? truncate(t.userQuery, 30) : "-"}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">
                        <Link href={`/traces/${t.traceId}`} className="text-blue-600 hover:underline font-mono text-xs break-all" title={t.traceId}>
                          {t.traceId || "-"}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {t.sessionId ? (
                          <Link href={`/sessions/${t.sessionId}`} className="text-blue-600 hover:underline break-all" title={`查看会话 ${t.sessionId}`}>
                            {t.sessionId}
                          </Link>
                        ) : "-"}
                      </td>
                      <td className="py-2 pr-4">{t.agentId}</td>
                      <td className="py-2 pr-4">
                        <BranchBadge branch={t.branchType} />
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={t.agentStatus} />
                      </td>
                      <td className="py-2 pr-4 font-mono">{t.costTimeMs}ms</td>
                      <td className="py-2 pr-4">{t.sourceService}</td>
                      <td className="py-2 text-xs text-muted-foreground">{t.createTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                上一页
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "SUCCESS" ? "default" : status === "FAIL" ? "destructive" : "secondary";
  return <Badge variant={variant as "default" | "destructive" | "secondary"}>{status}</Badge>;
}

function BranchBadge({ branch }: { branch?: string }) {
  if (!branch) return <span>-</span>;

  const colorMap: Record<string, string> = {
    RAG: "bg-blue-100 text-blue-800",
    DIRECT_ANSWER: "bg-green-100 text-green-800",
    TOOL_CALL: "bg-orange-100 text-orange-800",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colorMap[branch] || "bg-gray-100 text-gray-800"}`}>
      {branch}
    </span>
  );
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "-";
  return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
}
