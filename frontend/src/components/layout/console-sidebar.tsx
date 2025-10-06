/**
 * 控制台侧边栏组件
 * 控制台页面的侧边导航
 */

'use client';

import { TenantConfig } from '@/types/contracts';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Cpu, 
  Users, 
  AlertTriangle, 
  Settings,
  Home
} from 'lucide-react';

interface ConsoleSidebarProps {
  tenant: TenantConfig;
}

export function ConsoleSidebar({ tenant }: ConsoleSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: '仪表板',
      href: `/${tenant.id}/console`,
      icon: Home,
      current: pathname === `/${tenant.id}/console`
    },
    {
      name: '设备管理',
      href: `/${tenant.id}/iot`,
      icon: Cpu,
      current: pathname.startsWith(`/${tenant.id}/iot`)
    },
    {
      name: '数据分析',
      href: `/${tenant.id}/analytics`,
      icon: BarChart3,
      current: pathname.startsWith(`/${tenant.id}/analytics`)
    },
    {
      name: '用户管理',
      href: `/${tenant.id}/users`,
      icon: Users,
      current: pathname.startsWith(`/${tenant.id}/users`)
    },
    {
      name: '告警管理',
      href: `/${tenant.id}/alerts`,
      icon: AlertTriangle,
      current: pathname.startsWith(`/${tenant.id}/alerts`)
    },
    {
      name: '系统设置',
      href: `/${tenant.id}/settings`,
      icon: Settings,
      current: pathname.startsWith(`/${tenant.id}/settings`)
    }
  ];

  return (
    <div className="flex flex-col w-64 bg-white shadow-sm">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  item.current
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
              >
                <Icon
                  className={`${
                    item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 flex-shrink-0 h-6 w-6`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
