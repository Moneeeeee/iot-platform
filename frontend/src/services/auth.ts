/**
 * 认证服务
 * 处理用户认证相关的API调用
 */

import { apiClient } from '@/lib/api';
import { storage } from '@/lib/utils';
import { 
  LoginRequest, 
  LoginResponse, 
  User, 
  ApiResponse 
} from '@/types';

/**
 * 认证服务类
 */
export class AuthService {
  /**
   * 用户登录
   * @param credentials 登录凭据
   * @returns 登录响应
   */
  public async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
      
      // 保存认证信息
      if (response.token) {
        apiClient.setAuthToken(response.token);
        storage.set('user', response.user);
        storage.set('auth_token', response.token);
      }
      
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '登录失败');
    }
  }

  /**
   * 用户登出
   * @returns Promise<void>
   */
  public async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      // 即使API调用失败，也要清除本地认证信息
      console.warn('Logout API call failed:', error);
    } finally {
      // 清除本地认证信息
      apiClient.clearAuthToken();
      storage.remove('user');
      storage.remove('auth_token');
    }
  }

  /**
   * 获取当前用户信息
   * @returns 当前用户信息
   */
  public async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/api/auth/me');
      
      // 更新本地用户信息
      storage.set('user', response);
      
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '获取用户信息失败');
    }
  }

  /**
   * 刷新令牌
   * @returns 新的令牌信息
   */
  public async refreshToken(): Promise<{ token: string; expiresIn: string }> {
    try {
      const response = await apiClient.post<{ token: string; expiresIn: string }>('/api/auth/refresh');
      
      // 更新认证令牌
      if (response.token) {
        apiClient.setAuthToken(response.token);
        storage.set('auth_token', response.token);
      }
      
      return response;
    } catch (error) {
      // 刷新失败，清除认证信息
      this.logout();
      throw new Error(error instanceof Error ? error.message : '令牌刷新失败');
    }
  }

  /**
   * 检查用户是否已登录
   * @returns 是否已登录
   */
  public isAuthenticated(): boolean {
    const token = storage.get<string>('auth_token');
    const user = storage.get<User>('user');
    return !!(token && user);
  }

  /**
   * 获取当前用户
   * @returns 当前用户信息或null
   */
  public getCurrentUserFromStorage(): User | null {
    return storage.get<User>('user');
  }

  /**
   * 获取认证令牌
   * @returns 认证令牌或null
   */
  public getToken(): string | null {
    return storage.get<string>('auth_token');
  }

  /**
   * 检查令牌是否过期
   * @returns 是否过期
   */
  public isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      // 解析JWT令牌
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * 自动刷新令牌（如果即将过期）
   * @returns Promise<boolean> 是否成功刷新
   */
  public async autoRefreshToken(): Promise<boolean> {
    if (this.isTokenExpired()) {
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        console.error('Auto refresh token failed:', error);
        return false;
      }
    }
    return true;
  }

  /**
   * 设置用户语言偏好
   * @param language 语言代码
   */
  public setLanguage(language: string): void {
    storage.set('language', language);
  }

  /**
   * 获取用户语言偏好
   * @returns 语言代码
   */
  public getLanguage(): string {
    return storage.get<string>('language', 'zh-CN');
  }
}

// 创建认证服务实例
export const authService = new AuthService();

// 默认导出
export default authService;
