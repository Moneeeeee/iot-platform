/**
 * 控制台布局组件
 * 为控制台页面提供统一的布局
 */

'use client';

import { TenantConfig } from '@/types/contracts';
import { ConsoleSidebar } from './console-sidebar';
import { ConsoleHeader } from './console-header';

interface ConsoleLayoutProps {
  children: React.ReactNode;
  tenant: TenantConfig;
}

export function ConsoleLayout({ children, tenant }: ConsoleLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <ConsoleSidebar tenant={tenant} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConsoleHeader tenant={tenant} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
