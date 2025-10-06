/**
 * MQTT 配置服务
 * 管理 MQTT ACL 与动态凭证配置
 */

import { EventEmitter } from 'events';
import { prisma } from '../common/config/database';
import { logger } from '../common/logger';

export interface MQTTConfig {
  // Broker 配置
  brokers: Array<{
    url: string;
    port: number;
    priority: number;
    ssl: boolean;
    username?: string;
    password?: string;
  }>;
  
  // 客户端配置
  client: {
    keepAlive: number;
    cleanStart: boolean;
    sessionExpiry: number;
    connectTimeout: number;
    reconnectPeriod: number;
  };
  
  // TLS 配置
  tls: {
    enabled: boolean;
    caCert?: string;
    clientCert?: string;
    clientKey?: string;
    rejectUnauthorized: boolean;
  };
  
  // 主题配置
  topics: {
    telemetry: string;
    status: string;
    event: string;
    command: string;
    commandResponse: string;
    shadow: {
      desired: string;
      reported: string;
    };
    ota: {
      progress: string;
      status: string;
    };
    config: string;
  };
  
  // QoS 和 Retain 策略
  qosRetainPolicy: Record<string, { qos: number; retain: boolean }>;
  
  // ACL 配置
  acl: {
    publish: string[];
    subscribe: string[];
    deny: string[];
  };
  
  // 退避策略
  backoff: {
    baseMs: number;
    maxMs: number;
    jitter: boolean;
    multiplier: number;
  };
  
  // 消息限制
  limits: {
    maxMessageSize: number;
    maxInflight: number;
    messagesPerSecond: number;
    bytesPerSecond: number;
  };
}

export class MQTTConfigService extends EventEmitter {
  private static instance: MQTTConfigService;

  static getInstance(): MQTTConfigService {
    if (!MQTTConfigService.instance) {
      MQTTConfigService.instance = new MQTTConfigService();
    }
    return MQTTConfigService.instance;
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    logger.info('MQTT config service initialized');
  }

  /**
   * 获取 MQTT 配置
   */
  async getConfig(tenantId: string, deviceType: string): Promise<MQTTConfig> {
    try {
      // 获取租户配置
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const tenantConfig = tenant.config as any;
      const mqttConfig = tenantConfig.mqtt || {};
      
      // 合并默认配置
      const defaultConfig = this.getDefaultConfig(deviceType);
      const mergedConfig = this.mergeConfigs(defaultConfig, mqttConfig);

      // 生成主题配置
      mergedConfig.topics = this.generateTopics(tenantId, deviceType);

      return mergedConfig;
    } catch (error) {
      logger.error('Failed to get MQTT config', { tenantId, deviceType, error });
      throw error;
    }
  }

  /**
   * 更新 MQTT 配置
   */
  async updateConfig(tenantId: string, deviceType: string, config: Partial<MQTTConfig>): Promise<void> {
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
        mqtt: {
          ...currentConfig.mqtt,
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
        type: 'mqtt',
        tenantId,
        deviceType,
        config,
        timestamp: new Date()
      });

      logger.info('MQTT config updated', { tenantId, deviceType });
    } catch (error) {
      logger.error('Failed to update MQTT config', { tenantId, deviceType, error });
      throw error;
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(deviceType: string): MQTTConfig {
    const baseConfig: MQTTConfig = {
      brokers: [
        {
          url: process.env.MQTT_BROKER_URL || 'mqtt://emqx',
          port: parseInt(process.env.MQTT_BROKER_PORT || '1883'),
          priority: 1,
          ssl: process.env.MQTT_TLS_ENABLED === 'true'
        }
      ],
      client: {
        keepAlive: 60,
        cleanStart: true,
        sessionExpiry: 3600,
        connectTimeout: 30000,
        reconnectPeriod: 5000
      },
      tls: {
        enabled: process.env.MQTT_TLS_ENABLED === 'true',
        rejectUnauthorized: true
      },
      topics: {
        telemetry: '/telemetry',
        status: '/status',
        event: '/event',
        command: '/cmd',
        commandResponse: '/cmdres',
        shadow: {
          desired: '/shadow/desired',
          reported: '/shadow/reported'
        },
        ota: {
          progress: '/ota/progress',
          status: '/ota/status'
        },
        config: '/cfg'
      },
      qosRetainPolicy: {},
      acl: {
        publish: [],
        subscribe: [],
        deny: []
      },
      backoff: {
        baseMs: 1000,
        maxMs: 30000,
        jitter: true,
        multiplier: 2.0
      },
      limits: {
        maxMessageSize: 1024 * 1024, // 1MB
        maxInflight: 10,
        messagesPerSecond: 10,
        bytesPerSecond: 1024 * 1024 // 1MB
      }
    };

    // 根据设备类型调整配置
    if (deviceType.includes('datacenter')) {
      return {
        ...baseConfig,
        client: {
          ...baseConfig.client,
          keepAlive: 30,
          sessionExpiry: 1800
        },
        limits: {
          ...baseConfig.limits,
          messagesPerSecond: 50,
          bytesPerSecond: 10 * 1024 * 1024 // 10MB
        }
      };
    }

    if (deviceType.includes('industrial')) {
      return {
        ...baseConfig,
        client: {
          ...baseConfig.client,
          keepAlive: 60,
          sessionExpiry: 3600
        },
        limits: {
          ...baseConfig.limits,
          messagesPerSecond: 20,
          bytesPerSecond: 5 * 1024 * 1024 // 5MB
        }
      };
    }

    if (deviceType.includes('residential') || deviceType.includes('low-power')) {
      return {
        ...baseConfig,
        client: {
          ...baseConfig.client,
          keepAlive: 120,
          sessionExpiry: 7200,
          reconnectPeriod: 10000
        },
        limits: {
          ...baseConfig.limits,
          messagesPerSecond: 5,
          bytesPerSecond: 512 * 1024 // 512KB
        }
      };
    }

    return baseConfig;
  }

  /**
   * 生成主题配置
   */
  private generateTopics(tenantId: string, deviceType: string): MQTTConfig['topics'] {
    const prefix = `iot/${tenantId}/${deviceType}`;
    
    return {
      telemetry: `${prefix}/+/telemetry`,
      status: `${prefix}/+/status`,
      event: `${prefix}/+/event`,
      command: `${prefix}/+/cmd`,
      commandResponse: `${prefix}/+/cmdres`,
      shadow: {
        desired: `${prefix}/+/shadow/desired`,
        reported: `${prefix}/+/shadow/reported`
      },
      ota: {
        progress: `${prefix}/+/ota/progress`,
        status: `${prefix}/+/ota/status`
      },
      config: `${prefix}/+/cfg`
    };
  }

  /**
   * 合并配置
   */
  private mergeConfigs(defaultConfig: MQTTConfig, userConfig: any): MQTTConfig {
    const merged = { ...defaultConfig };
    
    for (const key in userConfig) {
      if (userConfig[key] !== null && userConfig[key] !== undefined) {
        if (typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
          merged[key as keyof MQTTConfig] = this.mergeConfigs(
            merged[key as keyof MQTTConfig] as any,
            userConfig[key]
          ) as any;
        } else {
          merged[key as keyof MQTTConfig] = userConfig[key] as any;
        }
      }
    }
    
    return merged;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: Partial<MQTTConfig>): void {
    // 验证 Broker 配置
    if (config.brokers) {
      for (const broker of config.brokers) {
        if (broker.port < 1 || broker.port > 65535) {
          throw new Error('Invalid broker port');
        }
        if (broker.priority < 1) {
          throw new Error('Broker priority must be at least 1');
        }
      }
    }

    // 验证客户端配置
    if (config.client) {
      if (config.client.keepAlive && config.client.keepAlive < 10) {
        throw new Error('Keep alive must be at least 10 seconds');
      }
      if (config.client.connectTimeout && config.client.connectTimeout < 1000) {
        throw new Error('Connect timeout must be at least 1000ms');
      }
    }

    // 验证限制配置
    if (config.limits) {
      if (config.limits.maxMessageSize && config.limits.maxMessageSize < 1024) {
        throw new Error('Max message size must be at least 1KB');
      }
      if (config.limits.messagesPerSecond && config.limits.messagesPerSecond < 1) {
        throw new Error('Messages per second must be at least 1');
      }
    }
  }

  /**
   * 获取设备特定的 MQTT 配置
   */
  async getDeviceMQTTConfig(
    tenantId: string,
    deviceType: string,
    deviceId: string
  ): Promise<{
    brokers: MQTTConfig['brokers'];
    client: MQTTConfig['client'];
    tls: MQTTConfig['tls'];
    topics: Record<string, string>;
    acl: MQTTConfig['acl'];
  }> {
    const config = await this.getConfig(tenantId, deviceType);
    const devicePrefix = `iot/${tenantId}/${deviceType}/${deviceId}`;

    return {
      brokers: config.brokers,
      client: config.client,
      tls: config.tls,
      topics: {
        telemetry: `${devicePrefix}/telemetry`,
        status: `${devicePrefix}/status`,
        event: `${devicePrefix}/event`,
        command: `${devicePrefix}/cmd`,
        commandResponse: `${devicePrefix}/cmdres`,
        shadowDesired: `${devicePrefix}/shadow/desired`,
        shadowReported: `${devicePrefix}/shadow/reported`,
        otaProgress: `${devicePrefix}/ota/progress`,
        otaStatus: `${devicePrefix}/ota/status`,
        config: `${devicePrefix}/cfg`
      },
      acl: config.acl
    };
  }
}

export const mqttConfigService = MQTTConfigService.getInstance();
