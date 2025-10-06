/**
 * 菜单生成器组件
 * 根据插件配置动态生成菜单
 */

'use client';

import { useEffect, useState } from 'react';
import { PluginMenu } from '@/types/contracts';
import Link from 'next/link';

interface MenuGeneratorProps {
  tenantId: string;
}

export function MenuGenerator({ tenantId }: MenuGeneratorProps) {
  const [menus, setMenus] = useState<PluginMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 这里应该从插件系统获取菜单配置
    // 暂时使用模拟数据
    const mockMenus: PluginMenu[] = [
      {
        id: 'devices',
        labelKey: 'menu.devices',
        to: `/${tenantId}/iot`,
        icon: 'cpu'
      },
      {
        id: 'analytics',
        labelKey: 'menu.analytics',
        to: `/${tenantId}/analytics`,
        icon: 'bar-chart'
      },
      {
        id: 'alerts',
        labelKey: 'menu.alerts',
        to: `/${tenantId}/alerts`,
        icon: 'alert-triangle'
      },
      {
        id: 'ota',
        labelKey: 'menu.ota',
        to: `/${tenantId}/ota`,
        icon: 'upload'
      }
    ];

    setMenus(mockMenus);
    setIsLoading(false);
  }, [tenantId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {menus.map((menu) => (
        <Link
          key={menu.id}
          href={menu.to}
          className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">
                  {menu.icon?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {menu.labelKey}
              </h3>
              <p className="text-xs text-gray-500">
                点击进入
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
