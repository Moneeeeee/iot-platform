/**
 * 租户控制台
 * 动态注入菜单和页面的控制台入口
 */

import { Metadata } from 'next';
import { ConsoleLayout } from '@/components/layout/console-layout';
import { MenuGenerator } from '@/components/layout/navigation/menu-generator';
import { getTenantConfig } from '../layout';

export const metadata: Metadata = {
  title: '控制台 - IoT Platform',
  description: 'IoT设备管理控制台',
};

export default async function TenantConsolePage({
  params,
}: {
  params: { tenant: string };
}) {
  const tenantConfig = await getTenantConfig(params.tenant);
  
  if (!tenantConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">租户配置加载失败</h1>
          <p className="text-gray-600">请检查租户配置是否正确</p>
        </div>
      </div>
    );
  }

  return (
    <ConsoleLayout tenant={tenantConfig}>
      <div className="space-y-6">
        {/* 欢迎区域 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            欢迎使用 {tenantConfig.name}
          </h1>
          <p className="text-gray-600 mt-2">
            {tenantConfig.description || 'IoT设备管理控制台'}
          </p>
        </div>

        {/* 快速操作 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">设备管理</h3>
            <p className="text-gray-600 text-sm mt-2">查看和管理所有设备</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">数据分析</h3>
            <p className="text-gray-600 text-sm mt-2">查看设备数据和统计</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">告警管理</h3>
            <p className="text-gray-600 text-sm mt-2">查看和处理告警</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">系统设置</h3>
            <p className="text-gray-600 text-sm mt-2">配置系统参数</p>
          </div>
        </div>

        {/* 动态菜单区域 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">可用功能</h2>
          <MenuGenerator tenantId={params.tenant} />
        </div>
      </div>
    </ConsoleLayout>
  );
}
