"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@chyuan/ui-kit";
import { Badge } from "@chyuan/ui-kit";

/**
 * 错误信息高亮组件
 * 当 Agent 状态为 FAIL 时，高亮展示错误信息
 */
export function ErrorHighlight({
  status,
  errorMessage,
}: {
  status?: string;
  errorMessage?: string;
}) {
  if (status !== "FAIL" || !errorMessage) return null;

  return (
    <Card className="border-l-4 border-l-red-500 bg-red-50/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-red-500">&#9888;</span> 错误信息
          <Badge variant="destructive">FAIL</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm text-red-700 bg-red-100 p-3 rounded font-mono overflow-x-auto">
          {errorMessage}
        </pre>
      </CardContent>
    </Card>
  );
}
