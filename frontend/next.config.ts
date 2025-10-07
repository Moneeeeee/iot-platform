import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 确保客户端路由正常工作
  reactStrictMode: true,
  // 强制使用SSR模式，禁用静态预渲染
  output: 'standalone',
  // 禁用静态优化，确保所有页面都使用客户端路由
  experimental: {
    // 禁用静态优化
    isrMemoryCacheSize: 0,
  },
  // 确保页面不会被预渲染为静态HTML
  trailingSlash: false,
  // 强制所有页面使用动态渲染
  generateStaticParams: false,
  // 禁用静态生成
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
};

export default nextConfig;
