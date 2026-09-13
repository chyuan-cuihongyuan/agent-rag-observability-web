import type { Metadata } from "next";

/** 路由级标题（SELFLOOP2 loop-249；根 layout 模板拼接平台名） */
export const metadata: Metadata = {
  title: "模型评测",
};

export default function EvalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
