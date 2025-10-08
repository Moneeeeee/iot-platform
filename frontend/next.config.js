/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
  // 优化构建
  swcMinify: true,
  // 压缩
  compress: true,
  // 图片优化
  images: {
    unoptimized: true,
  },
  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
