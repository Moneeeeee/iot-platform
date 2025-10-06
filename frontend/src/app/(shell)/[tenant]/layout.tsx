/**
 * 租户壳路由布局
 * 动态租户路由的根布局
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TenantLayout } from '@/components/layout/tenant-layout';
import { AuthGuard } from '@/components/guards/auth-guard';
import { TenantGuard } from '@/components/guards/tenant-guard';

// 获取租户配置
export async function getTenantConfig(tenantId: string) {
  // 暂时使用模拟数据，避免构建时的API调用
  const mockTenants = {
    'default': {
      id: 'default',
      name: '默认租户',
      description: '系统默认租户',
      theme: {
        mode: 'light',
        primaryColor: 'blue',
        brand: {
          logo: 'default',
          name: 'IoT Platform',
          favicon: 'default'
        }
      }
    },
    'tenant-a': {
      id: 'tenant-a',
      name: '企业租户A',
      description: '企业级租户配置',
      theme: {
        mode: 'dark',
        primaryColor: 'green',
        brand: {
          logo: 'tenant-a',
          name: 'Enterprise A',
          favicon: 'tenant-a'
        }
      }
    }
  };
  
  return mockTenants[tenantId as keyof typeof mockTenants] || null;
}

// 生成动态元数据
export async function generateMetadata({ 
  params 
}: { 
  params: { tenant: string } 
}): Promise<Metadata> {
  const tenantConfig = await getTenantConfig(params.tenant);
  
  if (!tenantConfig) {
    return {
      title: '租户不存在',
    };
  }

  return {
    title: `${tenantConfig.name} - IoT Platform`,
    description: tenantConfig.description || 'IoT设备管理平台',
  };
}

// 生成静态参数
export async function generateStaticParams() {
  // 这里应该从API获取所有租户ID
  // 暂时返回默认租户
  return [
    { tenant: 'default' },
    { tenant: 'tenant-a' },
    { tenant: 'tenant-b' },
  ];
}

export default async function TenantShellLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  const tenantConfig = await getTenantConfig(params.tenant);
  
  if (!tenantConfig) {
    notFound();
  }

  return (
    <AuthGuard>
      <TenantGuard tenantId={params.tenant}>
        <TenantLayout tenant={tenantConfig}>
          {children}
        </TenantLayout>
      </TenantGuard>
    </AuthGuard>
  );
}
