/**
 * 认证系统类型定义
 */

import { User, LoginCredentials, AuthContext } from '@/types/contracts';
import { ReactNode, ComponentType } from 'react';

// 认证状态
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 认证动作类型
export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_REFRESH'; payload: User }
  | { type: 'AUTH_CLEAR_ERROR' };

// 认证配置
export interface AuthConfig {
  apiBaseUrl: string;
  tokenStorageKey: string;
  refreshTokenStorageKey: string;
  tokenRefreshThreshold: number; // 提前多少秒刷新token
  maxRetries: number;
  retryDelay: number;
}

// JWT Token信息
export interface JwtPayload {
  sub: string; // 用户ID
  username: string;
  email: string;
  role: string;
  tenantId: string;
  permissions: string[];
  featureFlags: Record<string, boolean>;
  iat: number;
  exp: number;
}

// Token信息
export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// 权限检查结果
export interface PermissionCheck {
  hasPermission: boolean;
  missingPermissions: string[];
  reason?: string;
}

// 角色权限映射
export interface RolePermissions {
  [role: string]: string[];
}

// 认证中间件配置
export interface AuthMiddlewareConfig {
  protectedRoutes: string[];
  publicRoutes: string[];
  redirectTo: string;
  excludePaths: string[];
}

// 会话信息
export interface SessionInfo {
  user: User;
  tokenInfo: TokenInfo;
  lastActivity: number;
  isExpired: boolean;
}

// 认证错误类型
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

// 登录响应
export interface LoginResponse {
  user: User;
  tokenInfo: TokenInfo;
}

// 刷新Token响应
export interface RefreshTokenResponse {
  tokenInfo: TokenInfo;
}

// 权限守卫配置
export interface PermissionGuardConfig {
  requiredPermissions: string[];
  requireAll?: boolean; // true: 需要所有权限, false: 需要任一权限
  fallbackComponent?: ComponentType;
  redirectTo?: string;
}

// 租户切换配置
export interface TenantSwitchConfig {
  allowedTenants: string[];
  defaultTenant: string;
  requireConfirmation?: boolean;
}

// 认证Hook返回值
export interface UseAuthReturn extends AuthContext {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  checkPermission: (permission: string) => PermissionCheck;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// 认证Provider Props
export interface AuthProviderProps {
  children: ReactNode;
  config?: Partial<AuthConfig>;
  middlewareConfig?: Partial<AuthMiddlewareConfig>;
}

// 认证Hook配置
export interface UseAuthConfig {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onAuthStateChange?: (user: User | null) => void;
  onError?: (error: AuthError) => void;
}
