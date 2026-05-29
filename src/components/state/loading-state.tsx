"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** 提示文字，默认 "加载中..." */
  text?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 加载中状态组件
 *
 * 显示旋转加载图标和提示文字，用于数据加载过程。
 */
export function LoadingState({ text = "加载中...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground", className)}>
      <Loader2 className="size-8 animate-spin mb-3" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
