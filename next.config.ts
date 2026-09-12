import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const API_BASE =
  process.env.OBSERVABILITY_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8092";

const nextConfig: NextConfig = {
  // 启用 standalone 输出模式（用于 Docker 部署）
  output: 'standalone',
  // 监控前端通过 chyuan.ltd/obs/ 路径访问（共用单域名 SSL 证书）
  basePath: '/obs',

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_BASE}/api/v1/:path*`,
      },
    ];
  },
};

// AUTOLOOP al-20 / 工单 1020：产物体积分析开关（借鉴 vercel/next.js 插件，
// ANALYZE=true 时启用，默认构建零开销）；npm run analyze
export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
