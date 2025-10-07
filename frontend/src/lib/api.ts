/**
 * API客户端
 * 封装HTTP请求和响应处理
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { storage } from './utils';
import { ApiResponse, PaginatedResponse } from '@/types';
import { configManager } from './config';

/**
 * API客户端类
 */
class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = configManager.getApiBaseUrl();
    
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: configManager.getApiTimeout(),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 添加认证令牌
        const token = storage.get<string>('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加语言头
        const language = storage.get<string>('language', 'zh-CN');
        config.headers['Accept-Language'] = language;

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        // 处理认证错误
        if (error.response?.status === 401) {
          storage.remove('auth_token');
          storage.remove('user');
          window.location.href = '/login';
        }

        // 处理网络错误
        if (!error.response) {
          error.message = '网络连接失败，请检查网络设置';
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * 通用请求方法
   * @param config 请求配置
   * @returns Promise<T>
   */
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.instance.request<ApiResponse<T>>(config);
      return response.data.data as T;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || '请求失败');
    }
  }

  /**
   * GET请求
   * @param url 请求URL
   * @param config 请求配置
   * @returns Promise<T>
   */
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * POST请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise<T>
   */
  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT请求
   * @param url 请求URL
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise<T>
   */
  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * DELETE请求
   * @param url 请求URL
   * @param config 请求配置
   * @returns Promise<T>
   */
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * 分页请求
   * @param url 请求URL
   * @param params 查询参数
   * @param config 请求配置
   * @returns Promise<PaginatedResponse<T>>
   */
  public async getPaginated<T>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<PaginatedResponse<T>> {
    const response = await this.instance.get<PaginatedResponse<T>>(url, {
      ...config,
      params,
    });
    return response.data;
  }

  /**
   * 文件上传
   * @param url 上传URL
   * @param file 文件
   * @param onProgress 进度回调
   * @returns Promise<T>
   */
  public async upload<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  /**
   * 文件下载
   * @param url 下载URL
   * @param filename 文件名
   * @returns Promise<void>
   */
  public async download(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.instance.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw new Error('文件下载失败');
    }
  }

  /**
   * 设置认证令牌
   * @param token 认证令牌
   */
  public setAuthToken(token: string): void {
    storage.set('auth_token', token);
  }

  /**
   * 清除认证令牌
   */
  public clearAuthToken(): void {
    storage.remove('auth_token');
    storage.remove('user');
  }

  /**
   * 获取基础URL
   * @returns 基础URL
   */
  public getBaseURL(): string {
    return this.baseURL;
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient();

// 导出API客户端类
export { ApiClient };

// 默认导出
export default apiClient;
