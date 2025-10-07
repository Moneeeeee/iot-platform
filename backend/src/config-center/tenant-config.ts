/**
 * 租户配置服务
 * 管理租户级别的配置：主题模板、限流、计费策略等
 */

import { EventEmitter } from 'events';
import { prisma } from '@/common/config/database';
import { logger } from '@/common/logger';

export interface TenantConfig {
  // 基础配置
  name: string;
  slug: string;
  plan: string;
  status: string;
  
  // 主题模板配置
  mqttTopics: {
    prefix: string;
    telemetry: string;
    status: string;
    event: string;
    command: string;
    shadow: {
      desired: string;
      reported: string;
    };
    ota: {
      progress: string;
      status: string;
    };
  };
  
  // 限流配置
  rateLimits: {
    api: {
      windowMs: number;
      maxRequests: number;
    };
    mqtt: {
      messagesPerSecond: number;
      bytesPerSecond: number;
    };
    device: {
      maxDevices: number;
      maxConnections: number;
    };
  };
  
  // 计费策略
  billing: {
    enabled: boolean;
    currency: string;
    ratePerDevice: number;
    ratePerMessage: number;
    freeTier: {
      maxDevices: number;
      maxMessages: number;
    };
  };
  
  // 数据保留策略
  retention: {
    telemetry: number; // 天数
    events: number;
    logs: number;
    alerts: number;
  };
  
  // 安全配置
  security: {
    requireTLS: boolean;
    allowedOrigins: string[];
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  
  // 自定义配置
  custom: Record<string, any>;
}

export class TenantConfigService extends EventEmitter {
  private static instance: TenantConfigService;

  static getInstance(): TenantConfigService {
    if (!TenantConfigService.instance) {
      TenantConfigService.instance = new TenantConfigService();
    }
    return TenantConfigService.instance;
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    logger.info('Tenant config service initialized');
  }

  /**
   * 获取租户配置
   */
  async getConfig(tenantId: string): Promise<TenantConfig> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const config = tenant.config as any;
      
      // 合并默认配置
      const defaultConfig = this.getDefaultConfig(tenant.plan);
      const mergedConfig = this.mergeConfigs(defaultConfig, config);

      return {
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        ...mergedConfig
      };
    } catch (error) {
      logger.error('Failed to get tenant config', { tenantId, error });
      throw error;
    }
  }

  /**
   * 更新租户配置
   */
  async updateConfig(tenantId: string, config: Partial<TenantConfig>): Promise<void> {
    try {
      // 验证配置
      this.validateConfig(config);

      // 更新数据库
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          config: config as any,
          updatedAt: new Date()
        }
      });

      // 触发配置更新事件
      this.emit('configUpdated', {
        type: 'tenant',
        tenantId,
        config,
        timestamp: new Date()
      });

      logger.info('Tenant config updated', { tenantId });
    } catch (error) {
      logger.error('Failed to update tenant config', { tenantId, error });
      throw error;
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(plan: string): Partial<TenantConfig> {
    const baseConfig = {
      mqttTopics: {
        prefix: 'iot',
        telemetry: '/telemetry',
        status: '/status',
        event: '/event',
        command: '/cmd',
        shadow: {
          desired: '/shadow/desired',
          reported: '/shadow/reported'
        },
        ota: {
          progress: '/ota/progress',
          status: '/ota/status'
        }
      },
      rateLimits: {
        api: {
          windowMs: 60000, // 1分钟
          maxRequests: 100
        },
        mqtt: {
          messagesPerSecond: 10,
          bytesPerSecond: 1024 * 1024 // 1MB
        },
        device: {
          maxDevices: 100,
          maxConnections: 10
        }
      },
      billing: {
        enabled: false,
        currency: 'CNY',
        ratePerDevice: 0,
        ratePerMessage: 0,
        freeTier: {
          maxDevices: 10,
          maxMessages: 1000
        }
      },
      retention: {
        telemetry: 30,
        events: 90,
        logs: 30,
        alerts: 180
      },
      security: {
        requireTLS: false,
        allowedOrigins: ['*'],
        sessionTimeout: 3600,
        maxLoginAttempts: 5
      },
      custom: {}
    };

    // 根据套餐调整配置
    switch (plan) {
      case 'PROFESSIONAL':
        return {
          ...baseConfig,
          rateLimits: {
            ...baseConfig.rateLimits,
            api: { windowMs: 60000, maxRequests: 500 },
            mqtt: { messagesPerSecond: 50, bytesPerSecond: 5 * 1024 * 1024 },
            device: { maxDevices: 1000, maxConnections: 50 }
          },
          billing: {
            ...baseConfig.billing,
            enabled: true,
            ratePerDevice: 5.0,
            ratePerMessage: 0.001
          }
        };

      case 'ENTERPRISE':
        return {
          ...baseConfig,
          rateLimits: {
            ...baseConfig.rateLimits,
            api: { windowMs: 60000, maxRequests: 2000 },
            mqtt: { messagesPerSecond: 200, bytesPerSecond: 20 * 1024 * 1024 },
            device: { maxDevices: 10000, maxConnections: 200 }
          },
          billing: {
            ...baseConfig.billing,
            enabled: true,
            ratePerDevice: 3.0,
            ratePerMessage: 0.0005
          },
          security: {
            ...baseConfig.security,
            requireTLS: true
          }
        };

      default: // BASIC
        return baseConfig;
    }
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
  private validateConfig(config: Partial<TenantConfig>): void {
    // 验证限流配置
    if (config.rateLimits) {
      if (config.rateLimits.api?.maxRequests && config.rateLimits.api.maxRequests < 1) {
        throw new Error('API rate limit must be at least 1');
      }
      if (config.rateLimits.device?.maxDevices && config.rateLimits.device.maxDevices < 1) {
        throw new Error('Max devices must be at least 1');
      }
    }

    // 验证计费配置
    if (config.billing) {
      if (config.billing.ratePerDevice && config.billing.ratePerDevice < 0) {
        throw new Error('Rate per device cannot be negative');
      }
      if (config.billing.ratePerMessage && config.billing.ratePerMessage < 0) {
        throw new Error('Rate per message cannot be negative');
      }
    }

    // 验证保留策略
    if (config.retention) {
      const retention = config.retention;
      if (retention.telemetry && retention.telemetry < 1) {
        throw new Error('Telemetry retention must be at least 1 day');
      }
      if (retention.events && retention.events < 1) {
        throw new Error('Events retention must be at least 1 day');
      }
    }
  }

  /**
   * 获取所有租户配置
   */
  async getAllConfigs(): Promise<Map<string, TenantConfig>> {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { status: 'ACTIVE' }
      });

      const configs = new Map<string, TenantConfig>();
      
      for (const tenant of tenants) {
        const config = await this.getConfig(tenant.id);
        configs.set(tenant.id, config);
      }

      return configs;
    } catch (error) {
      logger.error('Failed to get all tenant configs', error);
      throw error;
    }
  }
}

export const tenantConfigService = TenantConfigService.getInstance();
