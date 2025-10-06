/**
 * 租户布局组件
 * 为租户页面提供统一的布局
 */

'use client';

import { TenantConfig } from '@/types/contracts';
import { ThemeProvider } from '@/core/theme/context';
import { TenantNavigation } from './tenant-navigation';

interface TenantLayoutProps {
  children: React.ReactNode;
  tenant: TenantConfig;
}

export function TenantLayout({ children, tenant }: TenantLayoutProps) {
  return (
    <ThemeProvider theme={tenant.theme}>
      <div className="min-h-screen bg-gray-50">
        <TenantNavigation tenant={tenant} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
