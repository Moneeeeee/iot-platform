/**
 * 设备配置服务
 * 管理设备级别的配置：采样间隔、阈值、OTA策略等
 */

import { EventEmitter } from 'events';
import { prisma } from '../common/config/database';
import { logger } from '../common/logger';

export interface DeviceConfig {
  // 设备模板信息
  template: {
    id: string;
    name: string;
    type: string;
    version: string;
  };
  
  // 采样配置
  sampling: {
    telemetryInterval: number; // 毫秒
    statusInterval: number;
    heartbeatInterval: number;
    batchSize: number;
  };
  
  // 阈值配置
  thresholds: {
    voltage: { min: number; max: number; alarm: boolean };
    current: { min: number; max: number; alarm: boolean };
    power: { min: number; max: number; alarm: boolean };
    temperature: { min: number; max: number; alarm: boolean };
    custom: Record<string, { min: number; max: number; alarm: boolean }>;
  };
  
  // 告警配置
  alerts: {
    enabled: boolean;
    channels: string[]; // email, sms, webhook
    cooldown: number; // 冷却时间（秒）
    escalation: {
      enabled: boolean;
      levels: Array<{
        delay: number; // 延迟时间（秒）
        channels: string[];
      }>;
    };
  };
  
  // 数据处理配置
  dataProcessing: {
    compression: boolean;
    encryption: boolean;
    validation: boolean;
    aggregation: {
      enabled: boolean;
      interval: number; // 聚合间隔（秒）
      functions: string[]; // avg, min, max, sum
    };
  };
  
  // 连接配置
  connection: {
    keepAlive: number;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  
  // 自定义配置
  custom: Record<string, any>;
}

export class DeviceConfigService extends EventEmitter {
  private static instance: DeviceConfigService;

  static getInstance(): DeviceConfigService {
    if (!DeviceConfigService.instance) {
      DeviceConfigService.instance = new DeviceConfigService();
    }
    return DeviceConfigService.instance;
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    logger.info('Device config service initialized');
  }

  /**
   * 获取设备配置
   */
  async getConfig(tenantId: string, deviceType: string): Promise<DeviceConfig> {
    try {
      // 获取设备模板
      const template = await prisma.deviceTemplate.findFirst({
        where: {
          tenantId,
          type: deviceType,
          isActive: true
        },
        orderBy: { version: 'desc' }
      });

      if (!template) {
        throw new Error(`Device template not found: ${deviceType} for tenant ${tenantId}`);
      }

      // 获取模板配置
      const templateConfig = template.attributes as any;
      
      // 合并默认配置
      const defaultConfig = this.getDefaultConfig(deviceType);
      const mergedConfig = this.mergeConfigs(defaultConfig, templateConfig);

      return {
        template: {
          id: template.id,
          name: template.name,
          type: template.type,
          version: template.version
        },
        ...mergedConfig
      };
    } catch (error) {
      logger.error('Failed to get device config', { tenantId, deviceType, error });
      throw error;
    }
  }

  /**
   * 更新设备配置
   */
  async updateConfig(tenantId: string, deviceType: string, config: Partial<DeviceConfig>): Promise<void> {
    try {
      // 验证配置
      this.validateConfig(config);

      // 获取设备模板
      const template = await prisma.deviceTemplate.findFirst({
        where: {
          tenantId,
          type: deviceType,
          isActive: true
        }
      });

      if (!template) {
        throw new Error(`Device template not found: ${deviceType} for tenant ${tenantId}`);
      }

      // 更新模板配置
      const currentAttributes = template.attributes as any;
      const updatedAttributes = this.mergeConfigs(currentAttributes, config);

      await prisma.deviceTemplate.update({
        where: { id: template.id },
        data: {
          attributes: updatedAttributes,
          updatedAt: new Date()
        }
      });

      // 触发配置更新事件
      this.emit('configUpdated', {
        type: 'device',
        tenantId,
        deviceType,
        config,
        timestamp: new Date()
      });

      logger.info('Device config updated', { tenantId, deviceType });
    } catch (error) {
      logger.error('Failed to update device config', { tenantId, deviceType, error });
      throw error;
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(deviceType: string): Partial<DeviceConfig> {
    const baseConfig = {
      sampling: {
        telemetryInterval: 5000, // 5秒
        statusInterval: 30000,   // 30秒
        heartbeatInterval: 60000, // 1分钟
        batchSize: 10
      },
      thresholds: {
        voltage: { min: 180, max: 250, alarm: true },
        current: { min: 0, max: 100, alarm: true },
        power: { min: 0, max: 25000, alarm: true },
        temperature: { min: -40, max: 85, alarm: true },
        custom: {}
      },
      alerts: {
        enabled: true,
        channels: ['email'],
        cooldown: 300, // 5分钟
        escalation: {
          enabled: false,
          levels: []
        }
      },
      dataProcessing: {
        compression: false,
        encryption: false,
        validation: true,
        aggregation: {
          enabled: false,
          interval: 300, // 5分钟
          functions: ['avg', 'min', 'max']
        }
      },
      connection: {
        keepAlive: 60,
        timeout: 30,
        retryAttempts: 3,
        retryDelay: 1000,
        backoffMultiplier: 2.0
      },
      custom: {}
    };

    // 根据设备类型调整配置
    if (deviceType.includes('datacenter')) {
      return {
        ...baseConfig,
        sampling: {
          telemetryInterval: 1000, // 1秒
          statusInterval: 10000,   // 10秒
          heartbeatInterval: 30000, // 30秒
          batchSize: 50
        },
        dataProcessing: {
          ...baseConfig.dataProcessing,
          compression: true,
          aggregation: {
            enabled: true,
            interval: 60, // 1分钟
            functions: ['avg', 'min', 'max', 'sum']
          }
        }
      };
    }

    if (deviceType.includes('industrial')) {
      return {
        ...baseConfig,
        sampling: {
          telemetryInterval: 2000, // 2秒
          statusInterval: 15000,   // 15秒
          heartbeatInterval: 45000, // 45秒
          batchSize: 20
        },
        thresholds: {
          ...baseConfig.thresholds,
          current: { min: 0, max: 200, alarm: true },
          power: { min: 0, max: 50000, alarm: true }
        }
      };
    }

    if (deviceType.includes('residential') || deviceType.includes('low-power')) {
      return {
        ...baseConfig,
        sampling: {
          telemetryInterval: 30000, // 30秒
          statusInterval: 60000,    // 1分钟
          heartbeatInterval: 120000, // 2分钟
          batchSize: 5
        },
        connection: {
          ...baseConfig.connection,
          keepAlive: 120,
          retryAttempts: 5,
          retryDelay: 2000
        }
      };
    }

    return baseConfig;
  }

  /**
   * 合并配置
   */
  private mergeConfigs(defaultConfig: any, userConfig: any): any {
    const merged = { ...defaultConfig };
    
    for (const key in userConfig) {
      if (userConfig[key] !== null && userConfig[key] !== undefined) {
        if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
          merged[key] = this.mergeConfigs(merged[key] || {}, userConfig[key]);
        } else {
          merged[key] = userConfig[key];
        }
      }
    }
    
    return merged;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: Partial<DeviceConfig>): void {
    // 验证采样配置
    if (config.sampling) {
      if (config.sampling.telemetryInterval && config.sampling.telemetryInterval < 100) {
        throw new Error('Telemetry interval must be at least 100ms');
      }
      if (config.sampling.batchSize && config.sampling.batchSize < 1) {
        throw new Error('Batch size must be at least 1');
      }
    }

    // 验证阈值配置
    if (config.thresholds) {
      const thresholds = config.thresholds;
      if (thresholds.voltage && thresholds.voltage.min >= thresholds.voltage.max) {
        throw new Error('Voltage min must be less than max');
      }
      if (thresholds.current && thresholds.current.min >= thresholds.current.max) {
        throw new Error('Current min must be less than max');
      }
    }

    // 验证连接配置
    if (config.connection) {
      if (config.connection.keepAlive && config.connection.keepAlive < 10) {
        throw new Error('Keep alive must be at least 10 seconds');
      }
      if (config.connection.retryAttempts && config.connection.retryAttempts < 0) {
        throw new Error('Retry attempts cannot be negative');
      }
    }
  }

  /**
   * 获取所有设备配置
   */
  async getAllConfigs(tenantId: string): Promise<Map<string, DeviceConfig>> {
    try {
      const templates = await prisma.deviceTemplate.findMany({
        where: {
          tenantId,
          isActive: true
        }
      });

      const configs = new Map<string, DeviceConfig>();
      
      for (const template of templates) {
        const config = await this.getConfig(tenantId, template.type);
        configs.set(template.type, config);
      }

      return configs;
    } catch (error) {
      logger.error('Failed to get all device configs', { tenantId, error });
      throw error;
    }
  }
}

export const deviceConfigService = DeviceConfigService.getInstance();
