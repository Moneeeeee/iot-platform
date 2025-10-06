/**
 * 租户守卫组件
 * 验证用户是否有权限访问指定租户
 */

'use client';

import { useAuth } from '@/core/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface TenantGuardProps {
  children: React.ReactNode;
  tenantId: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function TenantGuard({ 
  children, 
  tenantId,
  fallback,
  redirectTo = '/'
}: TenantGuardProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user && user.tenantId !== tenantId) {
      // 用户没有权限访问此租户
      router.push(redirectTo);
    }
  }, [isAuthenticated, user, tenantId, router, redirectTo]);

  if (!isAuthenticated || !user) {
    return fallback || null;
  }

  if (user.tenantId !== tenantId) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">访问被拒绝</h1>
          <p className="text-gray-600">您没有权限访问此租户</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
