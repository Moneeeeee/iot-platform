/**
 * 认证中间件
 * 处理JWT令牌验证和用户权限检查
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { User, UserRole, Permission } from '@/types';
import { logger } from '@/utils/logger';
import { config } from '@/config/config';

/**
 * 扩展Express Request接口，添加用户信息
 */
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'passwordHash'>;
    }
  }
}

/**
 * JWT载荷接口
 */
interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  iat: number;
  exp: number;
}

/**
 * 认证中间件类
 */
export class AuthMiddleware {
  /**
   * JWT令牌验证中间件
   * @param req Express请求对象
   * @param res Express响应对象
   * @param next 下一个中间件函数
   */
  static async authenticate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // 从请求头获取Authorization令牌
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'No token provided or invalid format',
          timestamp: new Date(),
        });
        return;
      }

      // 提取令牌
      const token = authHeader.substring(7);
      
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'No token provided',
          timestamp: new Date(),
        });
        return;
      }

      // 验证JWT令牌
      const decoded = jwt.verify(
        token,
        config.jwt.secret
      ) as JWTPayload;

      // 从数据库获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          permissions: true,
          language: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }) as any;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
          timestamp: new Date(),
        });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({
          success: false,
          error: 'User account is disabled',
          timestamp: new Date(),
        });
        return;
      }

      // 将用户信息添加到请求对象
      req.user = user;

      // 记录用户访问日志
      logger.info('User API access', { userId: user.id, action: 'API_ACCESS' });

      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          timestamp: new Date(),
        });
      } else if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          timestamp: new Date(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Authentication failed',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * 权限检查中间件
   * @param requiredPermission 需要的权限
   * @returns 中间件函数
   */
  static requirePermission(requiredPermission: Permission) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date(),
        });
        return;
      }

      // 检查用户权限
      if (!(req.user as any).permissions.includes(requiredPermission)) {
        logger.warn('Permission denied', {
          userId: (req.user as any).id,
          requiredPermission,
          userPermissions: (req.user as any).permissions,
        });

        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          timestamp: new Date(),
        });
        return;
      }

      next();
    };
  }

  /**
   * 角色检查中间件
   * @param requiredRole 需要的角色
   * @returns 中间件函数
   */
  static requireRole(requiredRole: UserRole) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date(),
        });
        return;
      }

      // 角色权限映射
      const roleHierarchy = {
        [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER],
        [UserRole.OPERATOR]: [UserRole.OPERATOR, UserRole.VIEWER],
        [UserRole.VIEWER]: [UserRole.VIEWER],
      };

      const allowedRoles = roleHierarchy[(req.user as any).role] || [];
      
      if (!allowedRoles.includes(requiredRole)) {
        logger.warn('Role access denied', {
          userId: (req.user as any).id,
          userRole: (req.user as any).role,
          requiredRole,
        });

        res.status(403).json({
          success: false,
          error: 'Insufficient role privileges',
          timestamp: new Date(),
        });
        return;
      }

      next();
    };
  }

  /**
   * 可选认证中间件
   * 如果提供了令牌则验证，否则继续执行
   * @param req Express请求对象
   * @param res Express响应对象
   * @param next 下一个中间件函数
   */
  static async optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        next();
        return;
      }

      // 尝试验证令牌
      const decoded = jwt.verify(
        token,
        config.jwt.secret
      ) as JWTPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          permissions: true,
          language: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }) as any;

      if (user && user.isActive) {
        req.user = user;
      }

      next();
    } catch (error) {
      // 可选认证失败时继续执行，不返回错误
      next();
    }
  }

  /**
   * 管理员权限检查中间件
   * @param req Express请求对象
   * @param res Express响应对象
   * @param next 下一个中间件函数
   */
  static requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    AuthMiddleware.requireRole(UserRole.ADMIN)(req, res, next);
  }

  /**
   * 操作员或管理员权限检查中间件
   * @param req Express请求对象
   * @param res Express响应对象
   * @param next 下一个中间件函数
   */
  static requireOperatorOrAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date(),
      });
      return;
    }

    if ((req.user as any).role === UserRole.ADMIN || (req.user as any).role === UserRole.OPERATOR) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Operator or admin privileges required',
        timestamp: new Date(),
      });
    }
  }
}

// 导出中间件函数
export const authenticate = AuthMiddleware.authenticate;
export const requirePermission = AuthMiddleware.requirePermission;
export const requireRole = AuthMiddleware.requireRole;
export const optionalAuth = AuthMiddleware.optionalAuth;
export const requireAdmin = AuthMiddleware.requireAdmin;
export const requireOperatorOrAdmin = AuthMiddleware.requireOperatorOrAdmin;

// 默认导出
export default AuthMiddleware;
