import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import { refreshToken } from '../utils/jwt';

// Zod 验证 schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'operator', 'viewer']).default('viewer'),
  tenant_id: z.string().min(1, 'Tenant ID is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  tenant_id: z.string().min(1, 'Tenant ID is required'),
});

export const authRoutes = async (
  fastify: FastifyInstance,
  authService: AuthService
) => {
  /**
   * 用户注册
   */
  fastify.post('/api/v1/auth/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      const user = await authService.register(body);

      reply.code(201).send({
        success: true,
        user,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.code(400).send({
          success: false,
          error: error.message || 'Registration failed',
        });
      }
    }
  });

  /**
   * 用户登录
   */
  fastify.post('/api/v1/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const result = await authService.login(
        { email: body.email, password: body.password },
        body.tenant_id
      );

      reply.send({
        success: true,
        token: result.tokens.token,
        refreshToken: result.tokens.refreshToken,
        user: result.user,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.code(401).send({
          success: false,
          error: error.message || 'Login failed',
        });
      }
    }
  });

  /**
   * 刷新 Token
   */
  fastify.post('/api/v1/auth/refresh', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        reply.code(401).send({
          success: false,
          error: 'Missing authorization header',
        });
        return;
      }

      const oldRefreshToken = authHeader.replace('Bearer ', '');
      const tokens = await refreshToken(oldRefreshToken);

      reply.send({
        success: true,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
      });
    } catch (error: any) {
      reply.code(401).send({
        success: false,
        error: error.message || 'Token refresh failed',
      });
    }
  });

  /**
   * 获取用户信息
   */
  fastify.get(
    '/api/v1/auth/profile',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        const user = await authService.getProfile(
          request.user!.userId,
          request.user!.tenantId
        );

        reply.send({
          success: true,
          user,
        });
      } catch (error: any) {
        reply.code(404).send({
          success: false,
          error: error.message || 'User not found',
        });
      }
    }
  );

  /**
   * 退出登录
   */
  fastify.post(
    '/api/v1/auth/logout',
    { preHandler: requireAuth },
    async (request, reply) => {
      try {
        await authService.logout(request.user!.userId);

        reply.send({
          success: true,
          message: 'Logged out successfully',
        });
      } catch (error: any) {
        reply.code(500).send({
          success: false,
          error: error.message || 'Logout failed',
        });
      }
    }
  );
};


