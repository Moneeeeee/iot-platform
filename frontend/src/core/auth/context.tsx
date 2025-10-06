/**
 * 认证上下文和Provider
 */

'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { 
  AuthState, 
  AuthAction, 
  AuthConfig, 
  UseAuthReturn,
  AuthProviderProps,
  TokenInfo,
  JwtPayload
} from './types';
import { User, LoginCredentials } from '@/types/contracts';

// 默认配置
const defaultConfig: AuthConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  tokenStorageKey: 'iot_platform_access_token',
  refreshTokenStorageKey: 'iot_platform_refresh_token',
  tokenRefreshThreshold: 300, // 5分钟
  maxRetries: 3,
  retryDelay: 1000,
};

// 认证状态初始值
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// 认证Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'AUTH_REFRESH':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// 创建认证上下文
const AuthContext = createContext<UseAuthReturn | null>(null);

// 解析JWT Token
function parseJwtToken(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to parse JWT token:', error);
    return null;
  }
}

// 检查Token是否过期
function isTokenExpired(token: string): boolean {
  const payload = parseJwtToken(token);
  if (!payload) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}

// 检查Token是否需要刷新
function shouldRefreshToken(token: string, threshold: number): boolean {
  const payload = parseJwtToken(token);
  if (!payload) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now <= threshold;
}

// 从Token创建用户对象
function createUserFromToken(payload: JwtPayload): User {
  return {
    id: payload.sub,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
    permissions: payload.permissions,
    featureFlags: payload.featureFlags,
  };
}

// 认证Provider组件
export function AuthProvider({ children, config: userConfig }: AuthProviderProps) {
  const config = { ...defaultConfig, ...userConfig };
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 从localStorage获取Token
  const getStoredTokens = useCallback((): TokenInfo | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const accessToken = localStorage.getItem(config.tokenStorageKey);
      const refreshToken = localStorage.getItem(config.refreshTokenStorageKey);
      
      if (!accessToken || !refreshToken) return null;
      
      const payload = parseJwtToken(accessToken);
      if (!payload) return null;
      
      return {
        accessToken,
        refreshToken,
        expiresAt: payload.exp * 1000,
      };
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return null;
    }
  }, [config]);

  // 存储Token
  const storeTokens = useCallback((tokenInfo: TokenInfo) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(config.tokenStorageKey, tokenInfo.accessToken);
      localStorage.setItem(config.refreshTokenStorageKey, tokenInfo.refreshToken);
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }, [config]);

  // 清除Token
  const clearTokens = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(config.tokenStorageKey);
      localStorage.removeItem(config.refreshTokenStorageKey);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }, [config]);

  // 刷新Token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const tokenInfo = getStoredTokens();
    if (!tokenInfo) return false;

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenInfo.refreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const newTokenInfo: TokenInfo = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
      };

      storeTokens(newTokenInfo);
      
      const payload = parseJwtToken(newTokenInfo.accessToken);
      if (payload) {
        const user = createUserFromToken(payload);
        dispatch({ type: 'AUTH_REFRESH', payload: user });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
      dispatch({ type: 'AUTH_LOGOUT' });
      return false;
    }
  }, [config, getStoredTokens, storeTokens, clearTokens]);

  // 登录
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      const tokenInfo: TokenInfo = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
      };

      storeTokens(tokenInfo);
      
      const payload = parseJwtToken(tokenInfo.accessToken);
      if (!payload) {
        throw new Error('Invalid token received');
      }

      const user = createUserFromToken(payload);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  }, [config, storeTokens]);

  // 登出
  const logout = useCallback(async (): Promise<void> => {
    try {
      const tokenInfo = getStoredTokens();
      if (tokenInfo) {
        await fetch(`${config.apiBaseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenInfo.accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearTokens();
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, [config, getStoredTokens, clearTokens]);

  // 权限检查
  const hasPermission = useCallback((permission: string): boolean => {
    if (!state.user) return false;
    return state.user.permissions.includes(permission);
  }, [state.user]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!state.user) return false;
    return permissions.some(permission => state.user!.permissions.includes(permission));
  }, [state.user]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!state.user) return false;
    return permissions.every(permission => state.user!.permissions.includes(permission));
  }, [state.user]);

  // 切换租户
  const switchTenant = useCallback(async (tenantId: string): Promise<void> => {
    if (!state.user) throw new Error('User not authenticated');

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/switch-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredTokens()?.accessToken}`,
        },
        body: JSON.stringify({ tenantId }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch tenant');
      }

      const data = await response.json();
      const tokenInfo: TokenInfo = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
      };

      storeTokens(tokenInfo);
      
      const payload = parseJwtToken(tokenInfo.accessToken);
      if (payload) {
        const user = createUserFromToken(payload);
        dispatch({ type: 'AUTH_REFRESH', payload: user });
      }
    } catch (error) {
      console.error('Tenant switch failed:', error);
      throw error;
    }
  }, [config, state.user, getStoredTokens, storeTokens]);

  // 刷新用户信息
  const refreshUser = useCallback(async (): Promise<void> => {
    const tokenInfo = getStoredTokens();
    if (!tokenInfo) return;

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${tokenInfo.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const user = await response.json();
      dispatch({ type: 'AUTH_REFRESH', payload: user });
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // 尝试刷新token
      const refreshed = await refreshToken();
      if (!refreshed) {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    }
  }, [config, getStoredTokens, refreshToken]);

  // 清除错误
  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  // 初始化认证状态
  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') {
      dispatch({ type: 'AUTH_LOGOUT' });
      return;
    }

    const initializeAuth = async () => {
      const tokenInfo = getStoredTokens();
      if (!tokenInfo) {
        dispatch({ type: 'AUTH_LOGOUT' });
        return;
      }

      if (isTokenExpired(tokenInfo.accessToken)) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
        return;
      }

      const payload = parseJwtToken(tokenInfo.accessToken);
      if (payload) {
        const user = createUserFromToken(payload);
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };

    initializeAuth();
  }, [getStoredTokens, refreshToken]);

  // 自动刷新Token
  useEffect(() => {
    if (!state.isAuthenticated || typeof window === 'undefined') return;

    const tokenInfo = getStoredTokens();
    if (!tokenInfo) return;

    const checkAndRefresh = async () => {
      if (shouldRefreshToken(tokenInfo.accessToken, config.tokenRefreshThreshold)) {
        await refreshToken();
      }
    };

    // 每分钟检查一次
    const interval = setInterval(checkAndRefresh, 60000);
    return () => clearInterval(interval);
  }, [state.isAuthenticated, getStoredTokens, refreshToken, config.tokenRefreshThreshold]);

  const contextValue: UseAuthReturn = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermission: (permission: string) => ({
      hasPermission: hasPermission(permission),
      missingPermissions: hasPermission(permission) ? [] : [permission],
    }),
    switchTenant,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// 使用认证Hook
export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
