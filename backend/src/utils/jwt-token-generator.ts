/**
 * JWT Token 生成工具
 * 
 * 用于生成测试用的JWT token，支持不同的用户角色和权限
 */

import jwt from 'jsonwebtoken';
import { env } from '@/env';

// JWT payload 接口
interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  tenantId?: string;
  iat?: number;
  exp?: number;
}

// 用户角色定义
export const UserRoles = {
  ADMIN: 'admin',
  USER: 'user',
  DEVICE: 'device',
  TENANT_ADMIN: 'tenant_admin',
  TENANT_USER: 'tenant_user'
} as const;

// 预定义用户
export const TestUsers = {
  admin: {
    userId: 'admin-001',
    email: 'admin@iot-platform.com',
    roles: [UserRoles.ADMIN],
    tenantId: 'default'
  },
  tenantAdmin: {
    userId: 'tenant-admin-001',
    email: 'tenant-admin@example.com',
    roles: [UserRoles.TENANT_ADMIN],
    tenantId: 'default'
  },
  tenantUser: {
    userId: 'tenant-user-001',
    email: 'tenant-user@example.com',
    roles: [UserRoles.TENANT_USER],
    tenantId: 'default'
  },
  device: {
    userId: 'device-001',
    email: 'device@iot-platform.com',
    roles: [UserRoles.DEVICE],
    tenantId: 'default'
  }
} as const;

/**
 * JWT Token 生成器
 */
export class JwtTokenGenerator {
  private readonly secret: string;
  private readonly defaultExpiry: number;

  constructor(secret?: string, defaultExpiryHours: number = 24) {
    this.secret = secret || env.JWT_SECRET;
    this.defaultExpiry = defaultExpiryHours * 60 * 60; // 转换为秒
  }

  /**
   * 生成JWT token
   */
  generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiryHours?: number): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (expiryHours ? expiryHours * 60 * 60 : this.defaultExpiry);

    const tokenPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: exp
    };

    return jwt.sign(tokenPayload, this.secret);
  }

  /**
   * 生成测试用户token
   */
  generateTestUserToken(userType: keyof typeof TestUsers, expiryHours?: number): string {
    const user = TestUsers[userType];
    return this.generateToken(user, expiryHours);
  }

  /**
   * 生成自定义用户token
   */
  generateCustomToken(
    userId: string,
    email: string,
    roles: string[],
    tenantId?: string,
    expiryHours?: number
  ): string {
    return this.generateToken({
      userId,
      email,
      roles,
      tenantId
    }, expiryHours);
  }

  /**
   * 验证token
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.secret) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取token信息（不验证签名）
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查token是否过期
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    return Date.now() / 1000 > decoded.exp;
  }

  /**
   * 获取token剩余有效时间（秒）
   */
  getTokenRemainingTime(token: string): number {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }
    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
  }
}

/**
 * 默认token生成器实例
 */
export const tokenGenerator = new JwtTokenGenerator();

/**
 * 快速生成测试token的辅助函数
 */
export const generateTestToken = {
  admin: (expiryHours?: number) => tokenGenerator.generateTestUserToken('admin', expiryHours),
  tenantAdmin: (expiryHours?: number) => tokenGenerator.generateTestUserToken('tenantAdmin', expiryHours),
  tenantUser: (expiryHours?: number) => tokenGenerator.generateTestUserToken('tenantUser', expiryHours),
  device: (expiryHours?: number) => tokenGenerator.generateTestUserToken('device', expiryHours),
  custom: (
    userId: string,
    email: string,
    roles: string[],
    tenantId?: string,
    expiryHours?: number
  ) => tokenGenerator.generateCustomToken(userId, email, roles, tenantId, expiryHours)
};

/**
 * Token 验证辅助函数
 */
export const validateToken = {
  isValid: (token: string) => tokenGenerator.verifyToken(token) !== null,
  isExpired: (token: string) => tokenGenerator.isTokenExpired(token),
  getRemainingTime: (token: string) => tokenGenerator.getTokenRemainingTime(token),
  decode: (token: string) => tokenGenerator.decodeToken(token)
};

// 导出默认实例
export default tokenGenerator;
