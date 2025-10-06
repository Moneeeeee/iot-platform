/**
 * PowerSafe数据大屏页面
 * 展示PowerSafe设备的实时监控数据和统计信息
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowLeft,
  Shield,
  Zap,
  Activity,
  BarChart3
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'PowerSafe数据大屏 - IoT设备管理平台',
  description: 'PowerSafe智能电源安全设备的实时数据监控大屏',
};

export default function PowerSafeDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/iot" className="flex items-center space-x-2">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
                <span className="text-xl font-bold text-gray-900">IoT Platform</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">实时数据</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面标题 */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PowerSafe数据大屏</h1>
              <p className="text-gray-600">实时电源安全监控数据</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* 关键指标卡片 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">当前电压</p>
                <p className="text-2xl font-bold text-gray-900">220.5V</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">当前电流</p>
                <p className="text-2xl font-bold text-gray-900">15.8A</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">实时功率</p>
                <p className="text-2xl font-bold text-gray-900">3.48kW</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">设备状态</p>
                <p className="text-2xl font-bold text-gray-900">正常</p>
              </div>
            </div>
          </div>
        </div>

        {/* 设备状态概览 */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">设备状态概览</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">在线设备</p>
                <p className="text-lg font-bold text-gray-900">12</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                <div className="h-4 w-4 bg-gray-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">离线设备</p>
                <p className="text-lg font-bold text-gray-900">1</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}