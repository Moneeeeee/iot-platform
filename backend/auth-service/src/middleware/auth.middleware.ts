import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, extractToken } from '../utils/jwt';
import { JWTPayload } from '../types/user';

// 扩展 Fastify Request 类型
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

/**
 * 认证中间件 - 验证 JWT Token
 */
export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // 提取 Token
    const token = extractToken(request.headers.authorization);

    if (!token) {
      reply.code(401).send({
        success: false,
        error: 'Missing authorization token',
      });
      return;
    }

    // 验证 Token
    const payload = await verifyToken(token);

    // 只允许 access token 访问 API
    if (payload.type !== 'access') {
      reply.code(401).send({
        success: false,
        error: 'Invalid token type',
      });
      return;
    }

    // 将用户信息附加到请求
    request.user = payload;
  } catch (error) {
    reply.code(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * 可选认证中间件 - Token 可选
 */
export const optionalAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const token = extractToken(request.headers.authorization);

    if (token) {
      const payload = await verifyToken(token);
      request.user = payload;
    }
  } catch (error) {
    // Token 无效时静默失败，不阻止请求
  }
};


