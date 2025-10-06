/**
 * OTA 配置服务
 * 管理固件更新策略、灰度发布、下载配置等
 */

import { EventEmitter } from 'events';
import { prisma } from '../common/config/database';
import { logger } from '../common/logger';

export interface OTAConfig {
  // 基础配置
  enabled: boolean;
  autoUpdate: boolean;
  
  // 固件仓库配置
  repository: {
    baseUrl: string;
    apiKey?: string;
    timeout: number;
    retryAttempts: number;
  };
  
  // 下载配置
  download: {
    chunkSize: number;
    maxConcurrent: number;
    timeout: number;
    retryAttempts: number;
    checksum: {
      algorithm: 'sha256' | 'md5';
      required: boolean;
    };
  };
  
  // 安装配置
  installation: {
    backupEnabled: boolean;
    rollbackEnabled: boolean;
    maxRetries: number;
    timeout: number;
    preInstallScript?: string;
    postInstallScript?: string;
  };
  
  // 灰度发布配置
  rollout: {
    strategy: 'immediate' | 'gradual' | 'canary';
    percentage: number; // 0-100
    canaryGroups: string[];
    conditions: {
      minBatteryLevel?: number;
      networkType?: string[];
      timeWindow?: {
        start: string; // HH:MM
        end: string;   // HH:MM
        timezone: string;
      };
      deviceTags?: string[];
    };
  };
  
  // 通知配置
  notifications: {
    enabled: boolean;
    channels: string[]; // email, sms, webhook
    events: string[]; // download_start, download_complete, install_start, install_complete, rollback
    templates: Record<string, string>;
  };
  
  // 监控配置
  monitoring: {
    enabled: boolean;
    metrics: {
      downloadSpeed: boolean;
      installTime: boolean;
      successRate: boolean;
      rollbackRate: boolean;
    };
    alerts: {
      enabled: boolean;
      thresholds: {
        downloadTimeout: number;
        installTimeout: number;
        failureRate: number;
      };
    };
  };
  
  // 版本管理
  versioning: {
    strategy: 'semantic' | 'numeric' | 'timestamp';
    forceUpdate: boolean;
    minVersion: string;
    maxVersion?: string;
  };
  
  // 自定义配置
  custom: Record<string, any>;
}

export class OTAConfigService extends EventEmitter {
  private static instance: OTAConfigService;

  static getInstance(): OTAConfigService {
    if (!OTAConfigService.instance) {
      OTAConfigService.instance = new OTAConfigService();
    }
    return OTAConfigService.instance;
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    logger.info('OTA config service initialized');
  }

  /**
   * 获取 OTA 配置
   */
  async getConfig(tenantId: string, deviceType: string): Promise<OTAConfig> {
    try {
      // 获取租户配置
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const tenantConfig = tenant.config as any;
      const otaConfig = tenantConfig.ota || {};
      
      // 合并默认配置
      const defaultConfig = this.getDefaultConfig(deviceType);
      const mergedConfig = this.mergeConfigs(defaultConfig, otaConfig);

      return mergedConfig;
    } catch (error) {
      logger.error('Failed to get OTA config', { tenantId, deviceType, error });
      throw error;
    }
  }

  /**
   * 更新 OTA 配置
   */
  async updateConfig(tenantId: string, deviceType: string, config: Partial<OTAConfig>): Promise<void> {
    try {
      // 验证配置
      this.validateConfig(config);

      // 获取租户配置
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const currentConfig = tenant.config as any;
      const updatedConfig = {
        ...currentConfig,
        ota: {
          ...currentConfig.ota,
          ...config
        }
      };

      // 更新数据库
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          config: updatedConfig,
          updatedAt: new Date()
        }
      });

      // 触发配置更新事件
      this.emit('configUpdated', {
        type: 'ota',
        tenantId,
        deviceType,
        config,
        timestamp: new Date()
      });

      logger.info('OTA config updated', { tenantId, deviceType });
    } catch (error) {
      logger.error('Failed to update OTA config', { tenantId, deviceType, error });
      throw error;
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(deviceType: string): OTAConfig {
    const baseConfig: OTAConfig = {
      enabled: true,
      autoUpdate: false,
      repository: {
        baseUrl: process.env.OTA_REPOSITORY_URL || 'https://firmware.fountain.top',
        timeout: 30000,
        retryAttempts: 3
      },
      download: {
        chunkSize: 1024 * 1024, // 1MB
        maxConcurrent: 3,
        timeout: 300000, // 5分钟
        retryAttempts: 3,
        checksum: {
          algorithm: 'sha256',
          required: true
        }
      },
      installation: {
        backupEnabled: true,
        rollbackEnabled: true,
        maxRetries: 3,
        timeout: 600000 // 10分钟
      },
      rollout: {
        strategy: 'gradual',
        percentage: 10,
        canaryGroups: [],
        conditions: {
          minBatteryLevel: 20,
          networkType: ['wifi', 'ethernet'],
          timeWindow: {
            start: '02:00',
            end: '06:00',
            timezone: 'Asia/Shanghai'
          }
        }
      },
      notifications: {
        enabled: true,
        channels: ['email'],
        events: ['download_start', 'install_complete', 'rollback'],
        templates: {}
      },
      monitoring: {
        enabled: true,
        metrics: {
          downloadSpeed: true,
          installTime: true,
          successRate: true,
          rollbackRate: true
        },
        alerts: {
          enabled: true,
          thresholds: {
            downloadTimeout: 600000, // 10分钟
            installTimeout: 900000,  // 15分钟
            failureRate: 0.1 // 10%
          }
        }
      },
      versioning: {
        strategy: 'semantic',
        forceUpdate: false,
        minVersion: '1.0.0'
      },
      custom: {}
    };

    // 根据设备类型调整配置
    if (deviceType.includes('datacenter')) {
      return {
        ...baseConfig,
        autoUpdate: true,
        rollout: {
          ...baseConfig.rollout,
          strategy: 'immediate',
          percentage: 100
        },
        download: {
          ...baseConfig.download,
          chunkSize: 5 * 1024 * 1024, // 5MB
          maxConcurrent: 5
        }
      };
    }

    if (deviceType.includes('industrial')) {
      return {
        ...baseConfig,
        rollout: {
          ...baseConfig.rollout,
          strategy: 'gradual',
          percentage: 25
        },
        installation: {
          ...baseConfig.installation,
          timeout: 1200000 // 20分钟
        }
      };
    }

    if (deviceType.includes('residential') || deviceType.includes('low-power')) {
      return {
        ...baseConfig,
        autoUpdate: false,
        rollout: {
          ...baseConfig.rollout,
          strategy: 'canary',
          percentage: 5,
          conditions: {
            ...baseConfig.rollout.conditions,
            minBatteryLevel: 50,
            networkType: ['wifi']
          }
        },
        download: {
          ...baseConfig.download,
          chunkSize: 512 * 1024, // 512KB
          maxConcurrent: 1
        }
      };
    }

    return baseConfig;
  }

  /**
   * 合并配置
   */
  private mergeConfigs(defaultConfig: OTAConfig, userConfig: any): OTAConfig {
    const merged = { ...defaultConfig };
    
    for (const key in userConfig) {
      if (userConfig[key] !== null && userConfig[key] !== undefined) {
        if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
          merged[key as keyof OTAConfig] = this.mergeConfigs(
            merged[key as keyof OTAConfig] as any,
            userConfig[key]
          ) as any;
        } else {
          merged[key as keyof OTAConfig] = userConfig[key] as any;
        }
      }
    }
    
    return merged;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: Partial<OTAConfig>): void {
    // 验证下载配置
    if (config.download) {
      if (config.download.chunkSize && config.download.chunkSize < 1024) {
        throw new Error('Chunk size must be at least 1KB');
      }
      if (config.download.maxConcurrent && config.download.maxConcurrent < 1) {
        throw new Error('Max concurrent downloads must be at least 1');
      }
    }

    // 验证灰度发布配置
    if (config.rollout) {
      if (config.rollout.percentage < 0 || config.rollout.percentage > 100) {
        throw new Error('Rollout percentage must be between 0 and 100');
      }
      if (config.rollout.conditions?.minBatteryLevel && 
          (config.rollout.conditions.minBatteryLevel < 0 || config.rollout.conditions.minBatteryLevel > 100)) {
        throw new Error('Min battery level must be between 0 and 100');
      }
    }

    // 验证安装配置
    if (config.installation) {
      if (config.installation.maxRetries && config.installation.maxRetries < 0) {
        throw new Error('Max retries cannot be negative');
      }
      if (config.installation.timeout && config.installation.timeout < 60000) {
        throw new Error('Installation timeout must be at least 1 minute');
      }
    }
  }

  /**
   * 检查设备是否符合 OTA 条件
   */
  async checkOTAEligibility(
    tenantId: string,
    deviceType: string,
    deviceInfo: {
      batteryLevel?: number;
      networkType?: string;
      tags?: string[];
      currentVersion: string;
    }
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const config = await this.getConfig(tenantId, deviceType);
      
      if (!config.enabled) {
        return { eligible: false, reason: 'OTA disabled' };
      }

      // 检查电池电量
      if (config.rollout.conditions.minBatteryLevel && 
          deviceInfo.batteryLevel && 
          deviceInfo.batteryLevel < config.rollout.conditions.minBatteryLevel) {
        return { eligible: false, reason: 'Battery level too low' };
      }

      // 检查网络类型
      if (config.rollout.conditions.networkType && 
          deviceInfo.networkType && 
          !config.rollout.conditions.networkType.includes(deviceInfo.networkType)) {
        return { eligible: false, reason: 'Network type not allowed' };
      }

      // 检查设备标签
      if (config.rollout.conditions.deviceTags && 
          deviceInfo.tags && 
          !config.rollout.conditions.deviceTags.some(tag => deviceInfo.tags!.includes(tag))) {
        return { eligible: false, reason: 'Device tags not matching' };
      }

      // 检查版本
      if (config.versioning.minVersion && 
          this.compareVersions(deviceInfo.currentVersion, config.versioning.minVersion) < 0) {
        return { eligible: false, reason: 'Current version too old' };
      }

      return { eligible: true };
    } catch (error) {
      logger.error('Failed to check OTA eligibility', { tenantId, deviceType, error });
      return { eligible: false, reason: 'Configuration error' };
    }
  }

  /**
   * 版本比较
   */
  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }
    
    return 0;
  }
}

export const otaConfigService = OTAConfigService.getInstance();
