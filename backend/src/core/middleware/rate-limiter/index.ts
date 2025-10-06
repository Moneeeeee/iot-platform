/**
 * 限流策略
 * 支持基于租户、设备、用户的多种限流策略
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../common/logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface RateLimitRule {
  name: string;
  config: RateLimitConfig;
  conditions: {
    tenantId?: string;
    deviceType?: string;
    path?: string;
    method?: string;
  };
}

export class RateLimiter {
  private static instance: RateLimiter;
  private rules: RateLimitRule[] = [];
  private counters = new Map<string, { count: number; resetTime: number }>();

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * 添加限流规则
   */
  addRule(rule: RateLimitRule): void {
    this.rules.push(rule);
    logger.info('Rate limit rule added', { rule: rule.name });
  }

  /**
   * 移除限流规则
   */
  removeRule(ruleName: string): void {
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
    logger.info('Rate limit rule removed', { rule: ruleName });
  }

  /**
   * 获取适用的限流规则
   */
  private getApplicableRules(req: Request): RateLimitRule[] {
    const auth = (req as any).auth;
    const tenantId = auth?.tenantId;
    const deviceType = auth?.deviceType;

    return this.rules.filter(rule => {
      const { conditions } = rule;
      
      // 检查租户条件
      if (conditions.tenantId && conditions.tenantId !== tenantId) {
        return false;
      }

      // 检查设备类型条件
      if (conditions.deviceType && conditions.deviceType !== deviceType) {
        return false;
      }

      // 检查路径条件
      if (conditions.path && !req.path.match(conditions.path)) {
        return false;
      }

      // 检查方法条件
      if (conditions.method && conditions.method !== req.method) {
        return false;
      }

      return true;
    });
  }

  /**
   * 生成限流键
   */
  private generateKey(req: Request, rule: RateLimitRule): string {
    const auth = (req as any).auth;
    const tenantId = auth?.tenantId || 'anonymous';
    const deviceId = auth?.deviceId || req.ip;
    
    return `${rule.name}:${tenantId}:${deviceId}`;
  }

  /**
   * 检查是否超过限流
   */
  private isRateLimited(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const counter = this.counters.get(key);

    if (!counter || now > counter.resetTime) {
      // 重置计数器
      this.counters.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return false;
    }

    if (counter.count >= config.maxRequests) {
      return true;
    }

    // 增加计数
    counter.count++;
    return false;
  }

  /**
   * 限流中间件
   */
  rateLimitMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const applicableRules = this.getApplicableRules(req);

        for (const rule of applicableRules) {
          const key = this.generateKey(req, rule);
          const isLimited = this.isRateLimited(key, rule.config);

          if (isLimited) {
            logger.warn('Rate limit exceeded', {
              rule: rule.name,
              key,
              ip: req.ip,
              path: req.path
            });

            if (rule.config.onLimitReached) {
              rule.config.onLimitReached(req, res);
            }

            return res.status(429).json({
              success: false,
              error: 'Rate limit exceeded',
              retryAfter: Math.ceil(rule.config.windowMs / 1000)
            });
          }
        }

        next();
      } catch (error) {
        logger.error('Rate limiter error', error);
        next();
      }
    };
  }

  /**
   * 获取限流统计
   */
  getStats(): { rules: number; activeCounters: number } {
    return {
      rules: this.rules.length,
      activeCounters: this.counters.size
    };
  }

  /**
   * 清理过期计数器
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, counter] of this.counters.entries()) {
      if (now > counter.resetTime) {
        this.counters.delete(key);
      }
    }
  }

  /**
   * 重置所有计数器
   */
  reset(): void {
    this.counters.clear();
    logger.info('All rate limit counters reset');
  }
}

export const rateLimiter = RateLimiter.getInstance();
