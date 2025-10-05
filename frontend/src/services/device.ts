/**
 * 设备管理服务
 * 处理设备相关的API调用
 */

import { apiClient } from '@/lib/api';
import { 
  Device, 
  CreateDeviceRequest, 
  UpdateDeviceRequest, 
  DeviceData, 
  DataQueryParams,
  PaginatedResponse,
  SearchParams
} from '@/types';

/**
 * 设备管理服务类
 */
export class DeviceService {
  /**
   * 获取设备列表
   * @param params 查询参数
   * @returns 分页设备列表
   */
  public async getDevices(params?: SearchParams): Promise<PaginatedResponse<Device>> {
    try {
      return await apiClient.getPaginated<Device>('/api/devices', params);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '获取设备列表失败');
    }
  }

  /**
   * 获取设备详情
   * @param deviceId 设备ID
   * @returns 设备详情
   */
  public async getDevice(deviceId: string): Promise<Device> {
    try {
      return await apiClient.get<Device>(`/api/devices/${deviceId}`);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '获取设备详情失败');
    }
  }

  /**
   * 创建设备
   * @param deviceData 设备数据
   * @returns 创建的设备
   */
  public async createDevice(deviceData: CreateDeviceRequest): Promise<Device> {
    try {
      return await apiClient.post<Device>('/api/devices', deviceData);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '创建设备失败');
    }
  }

  /**
   * 更新设备
   * @param deviceId 设备ID
   * @param deviceData 设备数据
   * @returns 更新后的设备
   */
  public async updateDevice(deviceId: string, deviceData: UpdateDeviceRequest): Promise<Device> {
    try {
      return await apiClient.put<Device>(`/api/devices/${deviceId}`, deviceData);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新设备失败');
    }
  }

  /**
   * 删除设备
   * @param deviceId 设备ID
   * @returns Promise<void>
   */
  public async deleteDevice(deviceId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/devices/${deviceId}`);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '删除设备失败');
    }
  }

  /**
   * 获取设备数据
   * @param params 查询参数
   * @returns 设备数据列表
   */
  public async getDeviceData(params: DataQueryParams): Promise<DeviceData[]> {
    try {
      const { deviceId, ...queryParams } = params;
      return await apiClient.get<DeviceData[]>(`/api/devices/${deviceId}/data`, {
        params: queryParams,
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '获取设备数据失败');
    }
  }

  /**
   * 控制设备
   * @param deviceId 设备ID
   * @param command 控制命令
   * @param parameters 命令参数
   * @returns Promise<void>
   */
  public async controlDevice(
    deviceId: string, 
    command: string, 
    parameters?: any
  ): Promise<void> {
    try {
      await apiClient.post(`/api/devices/${deviceId}/control`, {
        command,
        parameters,
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '控制设备失败');
    }
  }

  /**
   * 更新设备状态
   * @param deviceId 设备ID
   * @param status 设备状态
   * @returns 更新后的设备
   */
  public async updateDeviceStatus(deviceId: string, status: string): Promise<Device> {
    try {
      return await apiClient.put<Device>(`/api/devices/${deviceId}/status`, { status });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新设备状态失败');
    }
  }

  /**
   * 获取设备统计信息
   * @returns 设备统计信息
   */
  public async getDeviceStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    error: number;
    maintenance: number;
  }> {
    try {
      return await apiClient.get('/api/devices/stats');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '获取设备统计失败');
    }
  }

  /**
   * 批量操作设备
   * @param deviceIds 设备ID列表
   * @param action 操作类型
   * @param parameters 操作参数
   * @returns Promise<void>
   */
  public async batchOperation(
    deviceIds: string[], 
    action: string, 
    parameters?: any
  ): Promise<void> {
    try {
      await apiClient.post('/api/devices/batch', {
        deviceIds,
        action,
        parameters,
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '批量操作失败');
    }
  }

  /**
   * 导出设备数据
   * @param deviceId 设备ID
   * @param format 导出格式
   * @param params 查询参数
   * @returns Promise<void>
   */
  public async exportDeviceData(
    deviceId: string, 
    format: 'json' | 'csv' = 'json',
    params?: DataQueryParams
  ): Promise<void> {
    try {
      const { deviceId: _, ...queryParams } = params || {};
      await apiClient.download(
        `/api/devices/${deviceId}/export?format=${format}&${new URLSearchParams(queryParams as any).toString()}`
      );
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '导出设备数据失败');
    }
  }

  /**
   * 获取设备模板列表
   * @returns 设备模板列表
   */
  public async getDeviceTemplates(): Promise<any[]> {
    try {
      return await apiClient.get('/api/devices/templates');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '获取设备模板失败');
    }
  }

  /**
   * 根据模板创建设备
   * @param templateId 模板ID
   * @param deviceData 设备数据
   * @returns 创建的设备
   */
  public async createDeviceFromTemplate(
    templateId: string, 
    deviceData: Partial<CreateDeviceRequest>
  ): Promise<Device> {
    try {
      return await apiClient.post<Device>(`/api/devices/templates/${templateId}/create`, deviceData);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '根据模板创建设备失败');
    }
  }

  /**
   * 获取设备实时数据
   * @param deviceId 设备ID
   * @returns 实时数据流
   */
  public getDeviceRealtimeData(deviceId: string): EventSource {
    const token = localStorage.getItem('auth_token');
    const url = new URL(`${apiClient.getBaseURL()}/api/devices/${deviceId}/realtime`);
    if (token) {
      url.searchParams.set('token', token);
    }
    
    return new EventSource(url.toString());
  }

  /**
   * 上传设备配置
   * @param deviceId 设备ID
   * @param file 配置文件
   * @param onProgress 进度回调
   * @returns Promise<void>
   */
  public async uploadDeviceConfig(
    deviceId: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      await apiClient.upload(`/api/devices/${deviceId}/config`, file, onProgress);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '上传设备配置失败');
    }
  }

  /**
   * 下载设备配置
   * @param deviceId 设备ID
   * @param filename 文件名
   * @returns Promise<void>
   */
  public async downloadDeviceConfig(deviceId: string, filename?: string): Promise<void> {
    try {
      await apiClient.download(`/api/devices/${deviceId}/config`, filename);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '下载设备配置失败');
    }
  }

  /**
   * 重启设备
   * @param deviceId 设备ID
   * @returns Promise<void>
   */
  public async restartDevice(deviceId: string): Promise<void> {
    try {
      await this.controlDevice(deviceId, 'restart');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '重启设备失败');
    }
  }

  /**
   * 重置设备
   * @param deviceId 设备ID
   * @returns Promise<void>
   */
  public async resetDevice(deviceId: string): Promise<void> {
    try {
      await this.controlDevice(deviceId, 'reset');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '重置设备失败');
    }
  }

  /**
   * 更新设备固件
   * @param deviceId 设备ID
   * @param firmwareFile 固件文件
   * @param onProgress 进度回调
   * @returns Promise<void>
   */
  public async updateDeviceFirmware(
    deviceId: string, 
    firmwareFile: File, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      await apiClient.upload(`/api/devices/${deviceId}/firmware`, firmwareFile, onProgress);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : '更新设备固件失败');
    }
  }
}

// 创建设备服务实例
export const deviceService = new DeviceService();

// 默认导出
export default deviceService;
