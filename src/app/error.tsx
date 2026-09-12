"use client";

import { useEffect } from "react";

/**
 * 路由段渲染错误边界（SELFLOOP2 loop-205，Next.js App Router 官方模式）。
 * 页面组件抛错时保留侧边栏布局，展示错误卡片并可重试，替代整页白屏。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[obs-web] 页面渲染错误:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-destructive">页面渲染出错</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message?.slice(0, 200) || "未知错误"}
        </p>
        {error.digest ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground/70">
            digest: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          重试
        </button>
      </div>
    </div>
  );
}
