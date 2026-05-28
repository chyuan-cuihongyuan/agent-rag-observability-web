import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 输出模式（用于 Docker 部署）
  output: 'standalone',

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://agent-rag-observability-server:8092/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
