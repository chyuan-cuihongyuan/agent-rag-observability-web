import type { NextConfig } from "next";

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

export default nextConfig;
