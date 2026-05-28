"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "仪表盘", icon: "📊" },
  { href: "/traces", label: "Trace 查询", icon: "🔍" },
  { href: "/sessions", label: "会话视图", icon: "💬" },
  { href: "/eval", label: "评测管理", icon: "📋" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-muted/40 flex flex-col">
      <div className="h-14 flex items-center px-4 border-b font-semibold text-sm">
        Agent+RAG 监控
      </div>
      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted",
              (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">
        v1.0 · 端口 3000
      </div>
    </aside>
  );
}
