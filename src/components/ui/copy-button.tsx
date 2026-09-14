"use client";

/**
 * 一键复制按钮（SELFLOOP3 loop-315，工单 0428/0429）
 *
 * clipboard 写入成功后切「已复制」态 2 秒回落；失败静默 warn（复制是非关键路径）。
 */
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("复制失败:", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 px-2 ${className ?? ""}`}
      onClick={handleCopy}
      aria-label={copied ? "已复制" : "复制"}
      title={copied ? "已复制" : "复制"}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      <span className="text-xs ml-1">{copied ? "已复制" : "复制"}</span>
    </Button>
  );
}
