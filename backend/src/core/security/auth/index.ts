/**
 * 统一认证和租户解析
 * 支持 JWT、API Key、设备凭证等多种认证方式
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../common/config/database';
import { logger } from '../common/logger';
import { AppError } from '../common/errors';

export interface AuthContext {
  userId?: string;
  tenantId: string;
  deviceId?: string;
  deviceType?: string;
  permissions: string[];
  tokenType: 'user' | 'device' | 'api_key';
  expiresAt: Date;
}

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  limits: Record<string, any>;
  config: Record<string, any>;
}

export class AuthService {
  private static instance: AuthService;
  private tenantCache = new Map<string, { tenant: TenantInfo; expiry: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5分钟缓存

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * 解析认证信息
   */
  async authenticate(req: Request): Promise<AuthContext> {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;
    const deviceToken = req.headers['x-device-token'] as string;

    // 1. 设备认证
    if (deviceToken) {
      return this.authenticateDevice(deviceToken);
    }

    // 2. API Key 认证
    if (apiKey) {
      return this.authenticateApiKey(apiKey);
    }

    // 3. JWT 用户认证
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return this.authenticateUser(token);
    }

    throw new AppError(401, 'Authentication required');
  }

  /**
   * 用户 JWT 认证
   */
  private async authenticateUser(token: string): Promise<AuthContext> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { tenant: true }
      });

      if (!user || !user.isActive) {
        throw new AppError(401, 'Invalid user');
      }

      const tenant = await this.getTenantInfo(user.tenantId);

      return {
        userId: user.id,
        tenantId: user.tenantId,
        permissions: user.permissions || [],
        tokenType: 'user',
        expiresAt: new Date(decoded.exp * 1000)
      };
    } catch (error) {
      throw new AppError(401, 'Invalid token');
    }
  }

  /**
   * 设备认证
   */
  private async authenticateDevice(token: string): Promise<AuthContext> {
    try {
      const decoded = jwt.verify(token, process.env.DEVICE_JWT_SECRET!) as any;
      
      const device = await prisma.device.findUnique({
        where: { id: decoded.deviceId },
        include: { tenant: true, template: true }
      });

      if (!device || device.isDeleted) {
        throw new AppError(401, 'Invalid device');
      }

      const tenant = await this.getTenantInfo(device.tenantId);

      return {
        deviceId: device.id,
        tenantId: device.tenantId,
        deviceType: device.template.type,
        permissions: ['device:read', 'device:write'],
        tokenType: 'device',
        expiresAt: new Date(decoded.exp * 1000)
      };
    } catch (error) {
      throw new AppError(401, 'Invalid device token');
    }
  }

  /**
   * API Key 认证
   */
  private async authenticateApiKey(apiKey: string): Promise<AuthContext> {
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { tenant: true }
    });

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      throw new AppError(401, 'Invalid API key');
    }

    const tenant = await this.getTenantInfo(apiKeyRecord.tenantId);

    return {
      tenantId: apiKeyRecord.tenantId,
      permissions: apiKeyRecord.permissions || [],
      tokenType: 'api_key',
      expiresAt: apiKeyRecord.expiresAt
    };
  }

  /**
   * 获取租户信息（带缓存）
   */
  private async getTenantInfo(tenantId: string): Promise<TenantInfo> {
    const cached = this.tenantCache.get(tenantId);
    if (cached && Date.now() < cached.expiry) {
      return cached.tenant;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new AppError(403, 'Tenant not active');
    }

    const tenantInfo: TenantInfo = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      status: tenant.status,
      limits: tenant.limits as Record<string, any>,
      config: tenant.config as Record<string, any>
    };

    this.tenantCache.set(tenantId, {
      tenant: tenantInfo,
      expiry: Date.now() + this.TTL
    });

    return tenantInfo;
  }

  /**
   * 检查权限
   */
  hasPermission(context: AuthContext, permission: string): boolean {
    return context.permissions.includes(permission) || 
           context.permissions.includes('*');
  }

  /**
   * 中间件：认证
   */
  authenticateMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authContext = await this.authenticate(req);
        (req as any).auth = authContext;
        next();
      } catch (error) {
        if (error instanceof AppError) {
          return res.status(error.statusCode).json({
            success: false,
            error: error.message
          });
        }
        next(error);
      }
    };
  }

  /**
   * 中间件：权限检查
   */
  requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const auth = (req as any).auth as AuthContext;
      if (!auth || !this.hasPermission(auth, permission)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      next();
    };
  }
}

export const authService = AuthService.getInstance();
