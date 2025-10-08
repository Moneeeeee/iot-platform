// Core Layer - JWT 认证中间件
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '@/env';

export async function authJwt(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // 跳过认证的路径
  const skipPaths = [
    '/healthz', 
    '/api/healthz', 
    '/api/status',
    '/api/config/bootstrap'  // 设备引导接口不需要认证
  ];
  if (skipPaths.includes(request.url.split('?')[0] || '')) {
    return;
  }

  const token = request.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    reply.header('WWW-Authenticate', 'Bearer');
    return reply.status(401).send({ error: 'Missing authorization token' });
  }

  try {
    const decoded = jwt.verify(token as string, env.JWT_SECRET) as any;
    request.auth = {
      userId: decoded.userId || decoded.sub,
      email: decoded.email,
      roles: decoded.roles || []
    };
  } catch (error) {
    reply.header('WWW-Authenticate', 'Bearer');
    return reply.status(401).send({ error: 'Invalid token' });
  }
}
