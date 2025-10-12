import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '../types/user';

/**
 * 角色检查中间件
 * @param allowedRoles 允许的角色列表
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.code(403).send({
        success: false,
        error: 'Insufficient permissions',
        required_role: allowedRoles,
        your_role: request.user.role,
      });
      return;
    }
  };
};

/**
 * 租户隔离中间件
 * 确保用户只能访问自己租户的资源
 */
export const requireTenant = async (
  request: FastifyRequest<{
    Params: { tenantId?: string };
    Body: { tenant_id?: string };
  }>,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user) {
    reply.code(401).send({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  // 从路径参数或请求体获取租户 ID
  const requestedTenantId = request.params.tenantId || (request.body as any)?.tenant_id;

  if (!requestedTenantId) {
    // 如果请求中没有租户 ID，跳过检查
    return;
  }

  // Admin 可以访问所有租户
  if (request.user.role === 'admin') {
    return;
  }

  // 普通用户只能访问自己的租户
  if (requestedTenantId !== request.user.tenantId) {
    reply.code(403).send({
      success: false,
      error: 'Access denied to this tenant',
    });
    return;
  }
};

/**
 * Admin 专用中间件
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Operator 或更高权限
 */
export const requireOperator = requireRole(['admin', 'operator']);

/**
 * 所有认证用户（包括 Viewer）
 */
export const requireViewer = requireRole(['admin', 'operator', 'viewer']);


