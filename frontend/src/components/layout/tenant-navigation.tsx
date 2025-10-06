/**
 * 租户导航组件
 * 租户页面的顶部导航
 */

'use client';

import { TenantConfig } from '@/types/contracts';
import Link from 'next/link';
import { useAuth } from '@/core/auth/context';

interface TenantNavigationProps {
  tenant: TenantConfig;
}

export function TenantNavigation({ tenant }: TenantNavigationProps) {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href={`/${tenant.id}`} className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                {tenant.theme.brand.name}
              </h1>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              href={`/${tenant.id}/console`}
              className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              控制台
            </Link>
            <Link
              href={`/${tenant.id}/settings`}
              className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              设置
            </Link>
            {user && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{user.username}</span>
                <button
                  onClick={() => logout()}
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  退出
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
