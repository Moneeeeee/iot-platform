// Core Layer - 租户解析中间件
import { FastifyRequest, FastifyReply } from 'fastify';

export async function tenantResolver(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // 从多种来源解析租户 ID
  let tenantId: string | undefined;

  // 1. 从子域名解析 (tenant.example.com)
  const host = request.headers.host;
  if (host) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      tenantId = subdomain;
    }
  }

  // 2. 从 X-Tenant-ID 头部解析
  if (!tenantId) {
    tenantId = request.headers['x-tenant-id'] as string;
  }

  // 3. 从查询参数解析 (fallback)
  if (!tenantId) {
    tenantId = (request.query as any)?.tenantId;
  }

  // 4. 默认租户 (开发环境)
  if (!tenantId) {
    tenantId = 'default';
  }

  // 设置租户上下文
  request.tenant = {
    id: tenantId,
    name: tenantId
  };

  // 添加租户信息到响应头
  reply.header('X-Tenant-ID', tenantId);
}
