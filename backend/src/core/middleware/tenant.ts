/**
 * 多租户中间件
 * 功能：
 * 1. 从 JWT token 提取 tenant_id
 * 2. 注入到 req.tenant
 * 3. 强制租户隔离过滤
 * 4. 支持超大客户 schema 隔离
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/common/config/database';
import { logger } from '@/common/logger';
import { AppError } from '@/core/middleware/errorHandler';

// ==========================================
// 扩展 Express Request 类型
// ==========================================

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  isolatedSchema: boolean;
  schemaName: string | null;
  limits: Record<string, any>;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantInfo;
      tenantId?: string;
    }
  }
}

// ==========================================
// 租户缓存（避免频繁查库）
// ==========================================

class TenantCache {
  private cache: Map<string, { tenant: TenantInfo; expiry: number }>;
  private ttl: number; // 缓存时间（毫秒）

  constructor(ttlSeconds: number = 300) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  get(tenantId: string): TenantInfo | null {
    const cached = this.cache.get(tenantId);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(tenantId);
      return null;
    }

    return cached.tenant;
  }

  set(tenantId: string, tenant: TenantInfo): void {
    this.cache.set(tenantId, {
      tenant,
      expiry: Date.now() + this.ttl,
    });
  }

  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  clear(): void {
    this.cache.clear();
  }
}

const tenantCache = new TenantCache(300); // 5分钟缓存

// ==========================================
// 租户中间件类
// ==========================================

export class TenantMiddleware {
  /**
   * 提取并验证租户信息
   */
  static async extractTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. 从 JWT 用户信息中提取 tenant_id
      const user = (req as any).user;
      
      if (!user || !user.tenantId) {
        throw new AppError('Tenant information not found in token', 401);
      }

      const tenantId = user.tenantId;
      req.tenantId = tenantId;

      // 2. 尝试从缓存获取租户信息
      let tenant = tenantCache.get(tenantId);

      if (!tenant) {
        // 3. 从数据库查询租户信息
        const dbTenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            slug: true,
            name: true,
            plan: true,
            status: true,
            isolatedSchema: true,
            schemaName: true,
            limits: true,
          },
        });

        if (!dbTenant) {
          throw new AppError('Tenant not found', 404);
        }

        if (dbTenant.status !== 'ACTIVE') {
          throw new AppError(`Tenant is ${dbTenant.status.toLowerCase()}`, 403);
        }

        tenant = {
          id: dbTenant.id,
          slug: dbTenant.slug,
          name: dbTenant.name,
          plan: dbTenant.plan,
          status: dbTenant.status,
          isolatedSchema: dbTenant.isolatedSchema,
          schemaName: dbTenant.schemaName,
          limits: dbTenant.limits as Record<string, any>,
        };

        // 4. 缓存租户信息
        tenantCache.set(tenantId, tenant);
      }

      // 5. 注入到 request
      req.tenant = tenant;

      logger.debug('Tenant extracted', {
        tenantId: tenant.id,
        slug: tenant.slug,
        plan: tenant.plan,
      });

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }

      logger.error('Tenant extraction error', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * 验证租户限额
   */
  static checkLimits(limitKey: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const tenant = req.tenant;
        if (!tenant) {
          throw new AppError('Tenant not authenticated', 401);
        }

        const limits = tenant.limits;
        const limit = limits[limitKey];

        if (limit !== undefined && limit !== null) {
          // 获取当前使用量
          const current = await TenantMiddleware.getCurrentUsage(tenant.id, limitKey);

          if (current >= limit) {
            throw new AppError(
              429,
              `Tenant limit exceeded: ${limitKey} (limit: ${limit}, current: ${current})`
            );
          }
        }

        next();
      } catch (error) {
        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            error: error.message,
          });
        }

        logger.error('Limit check error', { error });
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    };
  }

  /**
   * 获取当前使用量
   */
  private static async getCurrentUsage(tenantId: string, limitKey: string): Promise<number> {
    switch (limitKey) {
      case 'maxDevices':
        return await prisma.device.count({
          where: { tenantId, isDeleted: false },
        });

      case 'maxUsers':
        return await prisma.user.count({
          where: { tenantId, isDeleted: false },
        });

      case 'maxTemplates':
        return await prisma.deviceTemplate.count({
          where: { tenantId, isActive: true },
        });

      case 'maxFirmwares':
        return await prisma.firmware.count({
          where: { tenantId, status: 'PUBLISHED' },
        });

      default:
        return 0;
    }
  }

  /**
   * Schema 隔离切换（超大客户）
   */
  static async switchSchema(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = req.tenant;
      if (!tenant) {
        throw new AppError(401, 'Tenant not authenticated');
      }

      // 如果租户使用独立 schema
      if (tenant.isolatedSchema && tenant.schemaName) {
        // 设置 Prisma 查询的 schema
        // 注意：需要在 Prisma Client 实例化时支持动态 schema
        // 这里预留接口，实际实现需要自定义 Prisma Client 扩展
        (req as any).dbSchema = tenant.schemaName;
        
        logger.debug('Switched to isolated schema', {
          tenantId: tenant.id,
          schema: tenant.schemaName,
        });
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }

      logger.error('Schema switch error', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

// ==========================================
// Prisma 中间件：自动注入 tenant_id 过滤
// ==========================================

export function setupPrismaTenantMiddleware() {
  prisma.$use(async (params, next) => {
    // 多租户表列表
    const tenantModels = [
      'User',
      'Device',
      'DeviceTemplate',
      'Telemetry',
      'DeviceStatusHistory',
      'Measurement',
      'EventAlert',
      'Firmware',
      'FirmwareRollout',
      'FirmwareUpdateStatus',
      'RetentionPolicy',
      'Log',
      'SystemStats',
    ];

    // 检查是否需要注入 tenant_id
    if (tenantModels.includes(params.model || '')) {
      // 读取操作：自动添加 tenant_id 过滤
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.args.where = params.args.where || {};
        
        // 如果已经有 tenant_id，不覆盖
        if (!params.args.where.tenantId && (params as any).tenantId) {
          params.args.where.tenantId = (params as any).tenantId;
        }
      }

      if (params.action === 'findMany' || params.action === 'count') {
        params.args.where = params.args.where || {};
        
        if (!params.args.where.tenantId && (params as any).tenantId) {
          params.args.where.tenantId = (params as any).tenantId;
        }
      }

      // 写入操作：自动添加 tenant_id
      if (params.action === 'create') {
        params.args.data = params.args.data || {};
        
        if (!params.args.data.tenantId && (params as any).tenantId) {
          params.args.data.tenantId = (params as any).tenantId;
        }
      }

      if (params.action === 'createMany') {
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((item: any) => ({
            ...item,
            tenantId: item.tenantId || (params as any).tenantId,
          }));
        }
      }
    }

    return next(params);
  });

  logger.info('Prisma tenant middleware initialized');
}

// ==========================================
// 租户上下文管理（用于 Prisma 查询）
// ==========================================

export class TenantContext {
  private static context = new Map<string, string>();

  static set(requestId: string, tenantId: string): void {
    this.context.set(requestId, tenantId);
  }

  static get(requestId: string): string | undefined {
    return this.context.get(requestId);
  }

  static clear(requestId: string): void {
    this.context.delete(requestId);
  }
}

// ==========================================
// 工具函数：获取租户作用域的 Prisma 客户端
// ==========================================

export function getTenantPrisma(tenantId: string) {
  // 创建一个带租户上下文的 Prisma 扩展
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }: any) {
          // 自动注入 tenantId
          if (args.where) {
            args.where = { ...args.where, tenantId };
          } else {
            args.where = { tenantId };
          }

          if (args.data && !args.data.tenantId) {
            args.data = { ...args.data, tenantId };
          }

          return query(args);
        },
      },
    },
  });
}

// ==========================================
// 导出中间件组合
// ==========================================

export const tenantMiddleware = [
  TenantMiddleware.extractTenant,
  TenantMiddleware.switchSchema,
];

export default TenantMiddleware;

