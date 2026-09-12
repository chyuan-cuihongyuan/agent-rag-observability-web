import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  description: "Agent + RAG 全链路监控评估平台",
  // SELFLOOP2 loop-225：元数据完整化（template/OG/robots）；basePath=/obs
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "Agent+RAG Observability",
    template: "%s | Agent+RAG Observability",
  },
  keywords: ["Agent", "RAG", "可观测性", "评测", "监控"],
  openGraph: {
    title: "Agent+RAG Observability",
    description: "Agent + RAG 全链路监控评估平台",
    type: "website",
    locale: "zh_CN",
    siteName: "Agent+RAG Observability",
  },
  twitter: {
    card: "summary",
    title: "Agent+RAG Observability",
    description: "Agent + RAG 全链路监控评估平台",
  },
  // 内网监控台：禁止搜索引擎索引
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
        <footer className="fixed bottom-2 right-3 text-[11px] text-muted-foreground/70 z-50 pointer-events-auto">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            京ICP备2026041953号-1
          </a>
        </footer>
      </body>
    </html>
  );
}
