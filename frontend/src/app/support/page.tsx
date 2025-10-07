/**
 * 技术支持页面
 * 提供技术支持和服务信息
 */

"use client";

import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MessageCircle, Clock } from 'lucide-react';

export default function SupportPage() {
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
              技术支持
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              专业的技术支持团队，为您提供7x24小时服务
            </p>
          </div>
        </div>
      </section>

      {/* 联系方式 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* 邮箱支持 */}
            <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Mail className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">邮箱支持</h3>
                <p className="mt-2 text-gray-600">
                  发送邮件到我们的技术支持邮箱，我们会在24小时内回复
                </p>
                <div className="mt-6">
                  <a
                    href="mailto:support@iot-platform.com"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    support@iot-platform.com
                  </a>
                </div>
              </div>
            </div>

            {/* 电话支持 */}
            <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Phone className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">电话支持</h3>
                <p className="mt-2 text-gray-600">
                  工作日9:00-18:00，我们的技术专家为您提供电话支持
                </p>
                <div className="mt-6">
                  <a
                    href="tel:+864001234567"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    +86 400-123-4567
                  </a>
                </div>
              </div>
            </div>

            {/* 在线客服 */}
            <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">在线客服</h3>
                <p className="mt-2 text-gray-600">
                  实时在线客服，快速响应您的技术问题
                </p>
                <div className="mt-6">
                  <button className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
                    开始对话
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 服务时间 */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              服务时间
            </h2>
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <Clock className="mx-auto h-12 w-12 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">工作日</h3>
                <p className="mt-2 text-sm text-gray-600">周一至周五 9:00-18:00</p>
              </div>
              <div className="text-center">
                <Clock className="mx-auto h-12 w-12 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">紧急支持</h3>
                <p className="mt-2 text-sm text-gray-600">7x24小时紧急响应</p>
              </div>
              <div className="text-center">
                <Clock className="mx-auto h-12 w-12 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">邮件支持</h3>
                <p className="mt-2 text-sm text-gray-600">24小时内回复</p>
              </div>
              <div className="text-center">
                <Clock className="mx-auto h-12 w-12 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">在线客服</h3>
                <p className="mt-2 text-sm text-gray-600">工作日实时响应</p>
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
