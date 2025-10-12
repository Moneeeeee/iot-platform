import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DeviceTokenService } from '../services/device-token.service';
import { requireAuth } from '../middleware/auth.middleware';
import { requireOperator } from '../middleware/rbac.middleware';

// Zod 验证 schemas
const generateTokenSchema = z.object({
  device_id: z.string().min(1, 'Device ID is required'),
  tenant_id: z.string().min(1, 'Tenant ID is required'),
  expires_in: z.string().regex(/^\d+[dhm]$/).optional().default('365d'),
});

const verifyTokenSchema = z.object({
  device_id: z.string().min(1, 'Device ID is required'),
  token: z.string().min(1, 'Token is required'),
});

export const deviceTokenRoutes = async (
  fastify: FastifyInstance,
  deviceTokenService: DeviceTokenService
) => {
  /**
   * 生成设备 Token
   */
  fastify.post(
    '/api/v1/auth/devices/token',
    { preHandler: [requireAuth, requireOperator] },
    async (request, reply) => {
      try {
        const body = generateTokenSchema.parse(request.body);

        // 验证租户权限
        if (body.tenant_id !== request.user!.tenantId && request.user!.role !== 'admin') {
          reply.code(403).send({
            success: false,
            error: 'Access denied to this tenant',
          });
          return;
        }

        const result = await deviceTokenService.generateToken(body);

        reply.code(201).send({
          success: true,
          ...result,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors,
          });
        } else {
          reply.code(500).send({
            success: false,
            error: error.message || 'Failed to generate device token',
          });
        }
      }
    }
  );

  /**
   * 验证设备 Token（公开端点，供设备调用）
   */
  fastify.post('/api/v1/auth/devices/verify', async (request, reply) => {
    try {
      const body = verifyTokenSchema.parse(request.body);

      const result = await deviceTokenService.verifyToken(body);

      reply.send({
        success: true,
        ...result,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.code(500).send({
          success: false,
          error: error.message || 'Token verification failed',
        });
      }
    }
  });

  /**
   * 撤销设备 Token
   */
  fastify.delete(
    '/api/v1/auth/devices/token/:deviceId',
    { preHandler: [requireAuth, requireOperator] },
    async (request: any, reply) => {
      try {
        const { deviceId } = request.params;
        const tenantId = request.user!.tenantId;

        const revoked = await deviceTokenService.revokeToken(deviceId, tenantId);

        if (!revoked) {
          reply.code(404).send({
            success: false,
            error: 'Device token not found',
          });
          return;
        }

        reply.send({
          success: true,
          message: 'Device token revoked successfully',
        });
      } catch (error: any) {
        reply.code(500).send({
          success: false,
          error: error.message || 'Failed to revoke token',
        });
      }
    }
  );

  /**
   * 列出设备 Tokens
   */
  fastify.get(
    '/api/v1/auth/devices/tokens',
    { preHandler: [requireAuth, requireOperator] },
    async (request, reply) => {
      try {
        const tenantId = request.user!.tenantId;
        const tokens = await deviceTokenService.listTokens(tenantId);

        reply.send({
          success: true,
          tokens,
        });
      } catch (error: any) {
        reply.code(500).send({
          success: false,
          error: error.message || 'Failed to list tokens',
        });
      }
    }
  );
};


