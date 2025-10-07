/**
 * 配置管理器
 * 统一管理所有配置的加载、更新、缓存
 */

import { EventEmitter } from 'events';
import { prisma } from '@/common/config/database';
import { logger } from '@/common/logger';
import { TenantConfigService } from '@/config-center/tenant-config';
import { DeviceConfigService } from '@/config-center/device-config';
import { MQTTConfigService } from '@/config-center/mqtt-config';
import { OTAConfigService } from '@/config-center/ota-config';

export interface ConfigUpdateEvent {
  type: 'tenant' | 'device' | 'mqtt' | 'ota';
  tenantId?: string;
  deviceId?: string;
  deviceType?: string;
  config: any;
  timestamp: Date;
}

export class ConfigManager extends EventEmitter {
  private static instance: ConfigManager;
  private tenantConfig: TenantConfigService;
  private deviceConfig: DeviceConfigService;
  private mqttConfig: MQTTConfigService;
  private otaConfig: OTAConfigService;
  private configCache = new Map<string, { config: any; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    super();
    this.tenantConfig = new TenantConfigService();
    this.deviceConfig = new DeviceConfigService();
    this.mqttConfig = new MQTTConfigService();
    this.otaConfig = new OTAConfigService();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 初始化配置管理器
   */
  async initialize(): Promise<void> {
    try {
      // 初始化各个配置服务
      await this.tenantConfig.initialize();
      await this.deviceConfig.initialize();
      await this.mqttConfig.initialize();
      await this.otaConfig.initialize();

      // 监听配置更新事件
      this.tenantConfig.on('configUpdated', (event) => this.handleConfigUpdate(event));
      this.deviceConfig.on('configUpdated', (event) => this.handleConfigUpdate(event));
      this.mqttConfig.on('configUpdated', (event) => this.handleConfigUpdate(event));
      this.otaConfig.on('configUpdated', (event) => this.handleConfigUpdate(event));

      logger.info('Config manager initialized');
    } catch (error) {
      logger.error('Failed to initialize config manager', error);
      throw error;
    }
  }

  /**
   * 获取租户配置
   */
  async getTenantConfig(tenantId: string): Promise<any> {
    const cacheKey = `tenant:${tenantId}`;
    const cached = this.configCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.config;
    }

    const config = await this.tenantConfig.getConfig(tenantId);
    this.configCache.set(cacheKey, {
      config,
      expiry: Date.now() + this.CACHE_TTL
    });

    return config;
  }

  /**
   * 获取设备配置
   */
  async getDeviceConfig(tenantId: string, deviceType: string): Promise<any> {
    const cacheKey = `device:${tenantId}:${deviceType}`;
    const cached = this.configCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.config;
    }

    const config = await this.deviceConfig.getConfig(tenantId, deviceType);
    this.configCache.set(cacheKey, {
      config,
      expiry: Date.now() + this.CACHE_TTL
    });

    return config;
  }

  /**
   * 获取 MQTT 配置
   */
  async getMQTTConfig(tenantId: string, deviceType: string): Promise<any> {
    const cacheKey = `mqtt:${tenantId}:${deviceType}`;
    const cached = this.configCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.config;
    }

    const config = await this.mqttConfig.getConfig(tenantId, deviceType);
    this.configCache.set(cacheKey, {
      config,
      expiry: Date.now() + this.CACHE_TTL
    });

    return config;
  }

  /**
   * 获取 OTA 配置
   */
  async getOTAConfig(tenantId: string, deviceType: string): Promise<any> {
    const cacheKey = `ota:${tenantId}:${deviceType}`;
    const cached = this.configCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.config;
    }

    const config = await this.otaConfig.getConfig(tenantId, deviceType);
    this.configCache.set(cacheKey, {
      config,
      expiry: Date.now() + this.CACHE_TTL
    });

    return config;
  }

  /**
   * 更新租户配置
   */
  async updateTenantConfig(tenantId: string, config: any): Promise<void> {
    await this.tenantConfig.updateConfig(tenantId, config);
    this.invalidateCache(`tenant:${tenantId}`);
  }

  /**
   * 更新设备配置
   */
  async updateDeviceConfig(tenantId: string, deviceType: string, config: any): Promise<void> {
    await this.deviceConfig.updateConfig(tenantId, deviceType, config);
    this.invalidateCache(`device:${tenantId}:${deviceType}`);
  }

  /**
   * 更新 MQTT 配置
   */
  async updateMQTTConfig(tenantId: string, deviceType: string, config: any): Promise<void> {
    await this.mqttConfig.updateConfig(tenantId, deviceType, config);
    this.invalidateCache(`mqtt:${tenantId}:${deviceType}`);
  }

  /**
   * 更新 OTA 配置
   */
  async updateOTAConfig(tenantId: string, deviceType: string, config: any): Promise<void> {
    await this.otaConfig.updateConfig(tenantId, deviceType, config);
    this.invalidateCache(`ota:${tenantId}:${deviceType}`);
  }

  /**
   * 处理配置更新事件
   */
  private handleConfigUpdate(event: ConfigUpdateEvent): void {
    // 清除相关缓存
    if (event.tenantId) {
      this.invalidateCache(`tenant:${event.tenantId}`);
    }
    
    if (event.tenantId && event.deviceType) {
      this.invalidateCache(`device:${event.tenantId}:${event.deviceType}`);
      this.invalidateCache(`mqtt:${event.tenantId}:${event.deviceType}`);
      this.invalidateCache(`ota:${event.tenantId}:${event.deviceType}`);
    }

    // 触发全局配置更新事件
    this.emit('configUpdated', event);

    logger.info('Configuration updated', {
      type: event.type,
      tenantId: event.tenantId,
      deviceType: event.deviceType
    });
  }

  /**
   * 清除缓存
   */
  private invalidateCache(pattern: string): void {
    for (const key of this.configCache.keys()) {
      if (key.startsWith(pattern)) {
        this.configCache.delete(key);
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.configCache.clear();
    logger.info('Configuration cache cleared');
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys())
    };
  }
}

export const configManager = ConfigManager.getInstance();
