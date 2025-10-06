/**
 * 租户首页
 * 动态租户路由的首页，可重定向到控制台
 */

import { redirect } from 'next/navigation';
import { getTenantConfig } from './layout';

export default async function TenantHomePage({
  params,
}: {
  params: { tenant: string };
}) {
  const tenantConfig = await getTenantConfig(params.tenant);
  
  if (!tenantConfig) {
    redirect('/');
  }

  // 重定向到控制台
  redirect(`/${params.tenant}/console`);
}
