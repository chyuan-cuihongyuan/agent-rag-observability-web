"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * AUTOLOOP al-28 / 工单 1028：TanStack Query Provider（试点批，借鉴 TanStack/query）。
 *
 * 默认策略（试点口径，后续按观测调）：
 * - staleTime 30s：切页 30 秒内零重拉（评估文档 §3 收益 1）
 * - retry 1：与后端 al-08 resilience4j 的轻量重试语义对齐（前端不再叠加重试风暴）
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
