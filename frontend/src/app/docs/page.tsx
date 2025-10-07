/**
 * 文档页面
 * 提供API文档和使用指南
 */

"use client";

import Link from 'next/link';
import { ArrowLeft, Book, Code, FileText, HelpCircle } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
                <span className="text-xl font-bold text-gray-900">IoT Platform</span>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link 
                  href="/" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  首页
                </Link>
                <Link 
                  href="/iot" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  设备总览
                </Link>
                <Link 
                  href="/login" 
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  登录管理
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面标题 */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              文档中心
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              完整的API文档和使用指南，帮助您快速上手IoT平台
            </p>
          </div>
        </div>
      </section>

      {/* 文档内容 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* API文档 */}
            <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Code className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">API文档</h3>
                <p className="mt-2 text-gray-600">
                  完整的REST API参考文档，包含所有端点和参数说明
                </p>
                <div className="mt-6">
                  <Link
                    href="/api/docs"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    查看API文档
                  </Link>
                </div>
              </div>
            </div>

            {/* 使用指南 */}
            <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Book className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">使用指南</h3>
                <p className="mt-2 text-gray-600">
                  详细的平台使用教程，从入门到高级功能
                </p>
                <div className="mt-6">
                  <Link
                    href="/docs/guide"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    查看使用指南
                  </Link>
                </div>
              </div>
            </div>

            {/* 常见问题 */}
            <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <HelpCircle className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">常见问题</h3>
                <p className="mt-2 text-gray-600">
                  常见问题解答，帮助您快速解决遇到的问题
                </p>
                <div className="mt-6">
                  <Link
                    href="/docs/faq"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    查看FAQ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-400">
              © 2024 IoT Platform. 保留所有权利。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
