// Core Layer - 幂等性中间件
import { FastifyRequest, FastifyReply } from 'fastify';
import { CacheService } from '@/infrastructure/cache/redis';

const cache = new CacheService();
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24小时

export async function idempotency(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // 只对写操作方法启用幂等性
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return;
  }

  let messageId = request.headers['x-message-id'] as string;
  
  // 如果没有提供X-Message-Id，使用默认值
  if (!messageId) {
    messageId = 'default';
    console.log('⚠️  未提供X-Message-Id，使用默认值:', messageId);
  }

  const cacheKey = `idempotency:${messageId}`;
  
  // 检查是否已处理过
  const cached = await cache.get<any>(cacheKey);
  if (cached) {
    // 如果有缓存的响应，直接返回
    if (cached.response) {
      return reply.status(cached.statusCode).headers(cached.headers).send(cached.response);
    }
    // 否则返回重复请求错误
    return reply.status(409).send({
      error: 'Duplicate request',
      messageId,
      timestamp: cached.timestamp
    });
  }

  // 拦截响应以缓存结果
  const originalSend = reply.send;
  reply.send = function(payload: any) {
    // 缓存响应
    cache.set(cacheKey, {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      headers: reply.getHeaders(),
      response: payload
    }, IDEMPOTENCY_TTL);
    
    return originalSend.call(this, payload);
  };
}
