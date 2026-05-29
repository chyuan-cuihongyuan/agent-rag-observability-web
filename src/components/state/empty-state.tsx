"use client";

import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** 提示文字，默认 "暂无数据" */
  text?: string;
  /** 附加描述文字 */
  description?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 空数据状态组件
 *
 * 用于列表、表格等数据为空时的占位展示。
 */
export function EmptyState({ text = "暂无数据", description, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-muted-foreground", className)}>
      <Inbox className="size-10 mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
      {description && (
        <p className="text-xs mt-1 opacity-70">{description}</p>
      )}
    </div>
  );
}
