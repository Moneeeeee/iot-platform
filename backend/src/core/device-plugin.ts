/**
 * 设备插件基类
 * 提供设备定制化功能的基类实现
 */

import { Router } from 'express';
import { DevicePlugin, PluginConfig, PluginContext, PluginRoute, PluginService } from './plugin-interface';
import { logger } from '@/common/logger';

export abstract class BaseDevicePlugin implements DevicePlugin {
  readonly deviceType: string;
  readonly config: PluginConfig;
  protected context: PluginContext;

  constructor(deviceType: string, config: PluginConfig) {
    this.deviceType = deviceType;
    this.config = config;
  }

  /**
   * 检查设备是否匹配此插件 - 默认实现
   */
  matchesDevice(deviceInfo: any): boolean {
    // 默认实现：检查设备类型是否匹配
    return deviceInfo.device_type === this.deviceType;
  }

  /**
   * 提取设备特定能力 - 默认实现
   */
  extractDeviceCapabilities(deviceInfo: any): string[] {
    return this.getDefaultCapabilities();
  }

  /**
   * 生成设备特定配置 - 默认实现
   */
  generateDeviceConfig(deviceInfo: any, baseConfig: any): any {
    return {
      ...baseConfig,
      deviceType: this.deviceType,
      capabilities: this.extractDeviceCapabilities(deviceInfo)
    };
  }

  /**
   * 初始化插件
   */
  async init(context: PluginContext): Promise<void> {
    this.context = context;
    logger.info('Device plugin initialized', {
      deviceType: this.deviceType,
      plugin: this.config.name
    });
  }

  /**
   * 注册路由 - 子类需要实现
   */
  abstract registerRoutes(): PluginRoute[];

  /**
   * 注册服务 - 子类需要实现
   */
  abstract registerServices(): PluginService[];

  /**
   * 配置更新回调
   */
  async onConfigUpdate(newConfig: any): Promise<void> {
    logger.info('Device plugin config updated', {
      deviceType: this.deviceType,
      plugin: this.config.name
    });
  }

  /**
   * 插件卸载
   */
  async shutdown(): Promise<void> {
    logger.info('Device plugin shutdown', {
      deviceType: this.deviceType,
      plugin: this.config.name
    });
  }

  /**
   * 获取设备模板定义
   */
  async getDeviceTemplate(): Promise<any> {
    // 从配置中心获取设备模板
    return {
      type: this.deviceType,
      name: this.config.name,
      version: this.config.version,
      attributes: this.getDefaultAttributes(),
      telemetryMetrics: this.getDefaultTelemetryMetrics(),
      events: this.getDefaultEvents(),
      commands: this.getDefaultCommands()
    };
  }

  /**
   * 处理设备消息
   */
  async processDeviceMessage(message: any): Promise<any> {
    try {
      // 基础消息处理逻辑
      const processedMessage = {
        ...message,
        processedAt: new Date(),
        deviceType: this.deviceType
      };

      // 子类可以重写此方法添加特定处理逻辑
      return await this.processMessage(processedMessage);
    } catch (error) {
      this.log('error', 'Failed to process device message', { message, error });
      throw error;
    }
  }

  /**
   * 处理设备命令
   */
  async processDeviceCommand(command: any): Promise<any> {
    try {
      // 基础命令处理逻辑
      const processedCommand = {
        ...command,
        processedAt: new Date(),
        deviceType: this.deviceType
      };

      // 子类可以重写此方法添加特定处理逻辑
      return await this.processCommand(processedCommand);
    } catch (error) {
      this.log('error', 'Failed to process device command', { command, error });
      throw error;
    }
  }

  /**
   * 获取默认设备属性
   */
  protected getDefaultAttributes(): Record<string, any> {
    return {
      manufacturer: 'Unknown',
      model: this.deviceType,
      firmware_version: '1.0.0',
      hardware_version: '1.0.0',
      capabilities: this.getDefaultCapabilities()
    };
  }

  /**
   * 获取默认遥测指标
   */
  protected getDefaultTelemetryMetrics(): Array<{
    name: string;
    type: string;
    unit?: string;
    range?: [number, number];
    validators?: string[];
  }> {
    return [
      {
        name: 'temperature',
        type: 'number',
        unit: '°C',
        range: [-40, 125],
        validators: ['range(-40,125)']
      },
      {
        name: 'humidity',
        type: 'number',
        unit: '%',
        range: [0, 100],
        validators: ['range(0,100)']
      },
      {
        name: 'status',
        type: 'string',
        validators: ['enum(online,offline,error)']
      }
    ];
  }

  /**
   * 获取默认事件
   */
  protected getDefaultEvents(): Array<{
    name: string;
    description: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    data?: Record<string, any>;
  }> {
    return [
      {
        name: 'device_started',
        description: 'Device started successfully',
        severity: 'info'
      },
      {
        name: 'device_stopped',
        description: 'Device stopped',
        severity: 'warning'
      },
      {
        name: 'device_error',
        description: 'Device encountered an error',
        severity: 'error'
      }
    ];
  }

  /**
   * 获取默认命令
   */
  protected getDefaultCommands(): Array<{
    name: string;
    description: string;
    parameters?: Record<string, any>;
    response?: Record<string, any>;
  }> {
    return [
      {
        name: 'reboot',
        description: 'Reboot the device',
        parameters: {
          delay: { type: 'number', default: 0, min: 0, max: 300 }
        },
        response: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      {
        name: 'get_status',
        description: 'Get device status',
        response: {
          status: { type: 'string' },
          uptime: { type: 'number' },
          memory: { type: 'object' }
        }
      }
    ];
  }

  /**
   * 获取默认能力
   */
  protected getDefaultCapabilities(): string[] {
    return [
      'telemetry',
      'status',
      'commands',
      'ota'
    ];
  }

  /**
   * 创建设备特定的路由前缀
   */
  protected getRoutePrefix(): string {
    return `/api/devices/${this.deviceType}`;
  }

  /**
   * 创建设备特定的中间件
   */
  protected createDeviceMiddleware() {
    return (req: any, res: any, next: any) => {
      // 确保请求针对正确的设备类型
      const deviceType = req.params.deviceType || req.body.deviceType;
      if (deviceType !== this.deviceType) {
        return res.status(400).json({
          success: false,
          error: 'Invalid device type'
        });
      }
      next();
    };
  }

  /**
   * 记录设备特定的日志
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logData = {
      deviceType: this.deviceType,
      plugin: this.config.name,
      ...data
    };

    switch (level) {
      case 'info':
        logger.info(message, logData);
        break;
      case 'warn':
        logger.warn(message, logData);
        break;
      case 'error':
        logger.error(message, logData);
        break;
    }
  }

  /**
   * 获取设备数据库实例
   */
  protected getDeviceDB() {
    return this.context.prisma;
  }

  /**
   * 验证设备数据
   */
  protected validateDeviceData(data: any, schema: any): boolean {
    try {
      // 这里可以集成 JSON Schema 验证库
      // 简化实现，实际项目中应该使用专业的验证库
      return true;
    } catch (error) {
      this.log('error', 'Device data validation failed', { data, error });
      return false;
    }
  }

  /**
   * 转换设备数据格式
   */
  protected transformDeviceData(data: any): any {
    // 子类可以重写此方法实现数据转换
    return data;
  }

  /**
   * 获取设备配置
   */
  protected async getDeviceConfig(tenantId: string): Promise<any> {
    return await this.context.configManager.getDeviceConfig(tenantId, this.deviceType);
  }

  /**
   * 处理消息 - 子类可以重写
   */
  protected async processMessage(message: any): Promise<any> {
    return message;
  }

  /**
   * 处理命令 - 子类可以重写
   */
  protected async processCommand(command: any): Promise<any> {
    return command;
  }

  /**
   * 获取设备统计信息
   */
  protected async getDeviceStats(tenantId: string): Promise<any> {
    try {
      const stats = await this.getDeviceDB().device.count({
        where: { 
          tenantId,
          template: {
            type: this.deviceType
          }
        }
      });

      return {
        deviceCount: stats,
        deviceType: this.deviceType,
        tenantId,
        timestamp: new Date()
      };
    } catch (error) {
      this.log('error', 'Failed to get device stats', { tenantId, error });
      return null;
    }
  }
}
