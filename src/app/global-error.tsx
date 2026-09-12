"use client";

/**
 * 布局级崩溃兜底（SELFLOOP2 loop-205）。Root Layout 自身抛错时 Next.js 走此文件，
 * 必须自带 html/body。此时侧边栏等全局组件均不可用，只能提供最小恢复路径。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[obs-web] 全局布局错误:", error);

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-background p-8">
        <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-card p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-destructive">应用发生严重错误</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            全局布局渲染失败，请尝试重试；若持续失败请刷新页面或联系管理员。
          </p>
          {error.digest ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground/70">
              digest: {error.digest}
            </p>
          ) : null}
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              重试
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              刷新页面
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
