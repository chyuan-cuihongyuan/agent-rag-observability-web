"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@chyuan/ui-kit";
import { cn } from "@chyuan/ui-kit";

interface ErrorStateProps {
  /** 错误信息 */
  message?: string;
  /** 重试按钮回调，传入则显示重试按钮 */
  onRetry?: () => void;
  /** 重试按钮文字，默认 "重试" */
  retryText?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 错误状态组件
 *
 * 用于请求失败、异常等场景，支持可选的重试按钮。
 */
export function ErrorState({
  message = "请求失败，请稍后重试",
  onRetry,
  retryText = "重试",
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground", className)}>
      <AlertTriangle className="size-10 mb-3 text-destructive/60" />
      <p className="text-sm text-center max-w-md">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          {retryText}
        </Button>
      )}
    </div>
  );
}
