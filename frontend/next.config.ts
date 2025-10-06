import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 移除basePath，让应用在根路径运行
  // basePath: "/iot",
  // 修复尾斜杠重定向循环
  trailingSlash: false,
  // 确保重定向处理正确
  async redirects() {
    return [];
  },
};

export default nextConfig;
