// Core Layer - 租户解析中间件
import { FastifyRequest, FastifyReply } from 'fastify';
import { getPrismaClient } from '@/infrastructure/db/prisma';

export async function tenantResolver(request: FastifyRequest, reply: FastifyReply) {
  let tenantId: string | undefined;

  // ✅ 1. 仅从请求体中解析
  if (request.body && typeof request.body === 'object') {
    const body = request.body as any;
    if (body.tenantId && typeof body.tenantId === 'string') {
      tenantId = body.tenantId.trim();
      console.log('🏢 从请求体解析租户ID:', tenantId);
    }
  }

  // ✅ 2. 没有就统一走 default
  if (!tenantId) {
    tenantId = 'default';
    console.log('🏢 使用默认租户ID:', tenantId);
  }

  // ✅ 3. 数据库中查找或创建租户
  const prisma = getPrismaClient();
  let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  if (!tenant) {
    console.log(`🏗️ 租户 ${tenantId} 不存在，创建中...`);
    tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: tenantId === 'default' ? 'Default Tenant' : `${tenantId} Tenant`,
        timezone: 'Asia/Shanghai',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  request.tenant = {
    id: tenant.id,
    name: tenant.name,
    timezone: tenant.timezone,
  };

  reply.header('X-Tenant-ID', tenantId);
}
