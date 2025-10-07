/**
 * 消息幂等处理
 * 确保重复消息只处理一次
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '@/common/logger';

export interface IdempotencyConfig {
  keyGenerator?: (req: Request) => string;
  ttl?: number; // 幂等键的生存时间（毫秒）
  storage?: 'memory' | 'redis';
}

export interface IdempotencyResult {
  isDuplicate: boolean;
  response?: any;
  key: string;
}

export class IdempotencyService {
  private static instance: IdempotencyService;
  private cache = new Map<string, { response: any; expiry: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

  static getInstance(): IdempotencyService {
    if (!IdempotencyService.instance) {
      IdempotencyService.instance = new IdempotencyService();
    }
    return IdempotencyService.instance;
  }

  /**
   * 生成幂等键
   */
  private generateKey(req: Request, config: IdempotencyConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // 默认键生成策略
    const auth = (req as any).auth;
    const tenantId = auth?.tenantId || 'anonymous';
    const deviceId = auth?.deviceId || req.ip;
    
    const content = JSON.stringify({
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
      tenantId,
      deviceId
    });

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 检查消息是否重复
   */
  async checkIdempotency(
    req: Request,
    config: IdempotencyConfig = {}
  ): Promise<IdempotencyResult> {
    const key = this.generateKey(req, config);
    const ttl = config.ttl || this.DEFAULT_TTL;
    const now = Date.now();

    // 检查缓存
    const cached = this.cache.get(key);
    if (cached && now < cached.expiry) {
      logger.debug('Idempotency check: duplicate request', { key });
      return {
        isDuplicate: true,
        response: cached.response,
        key
      };
    }

    // 清理过期条目
    if (cached && now >= cached.expiry) {
      this.cache.delete(key);
    }

    return {
      isDuplicate: false,
      key
    };
  }

  /**
   * 存储响应结果
   */
  async storeResponse(
    key: string,
    response: any,
    config: IdempotencyConfig = {}
  ): Promise<void> {
    const ttl = config.ttl || this.DEFAULT_TTL;
    const expiry = Date.now() + ttl;

    this.cache.set(key, {
      response,
      expiry
    });

    logger.debug('Idempotency response stored', { key, ttl });
  }

  /**
   * 幂等中间件
   */
  idempotencyMiddleware(config: IdempotencyConfig = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 只对 POST、PUT、PATCH 请求进行幂等检查
        if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
          return next();
        }

        const result = await this.checkIdempotency(req, config);

        if (result.isDuplicate) {
          logger.info('Duplicate request detected, returning cached response', {
            key: result.key,
            path: req.path
          });

          return res.json(result.response);
        }

        // 存储原始响应方法
        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
          // 存储响应
          this.storeResponse(result.key, body, config);
          return originalJson(body);
        };

        // 将幂等键添加到请求对象
        (req as any).idempotencyKey = result.key;

        next();
      } catch (error) {
        logger.error('Idempotency middleware error', error);
        next();
      }
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Idempotency cache cleaned', { cleanedCount });
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
    logger.info('Idempotency cache cleared');
  }
}

export const idempotencyService = IdempotencyService.getInstance();
