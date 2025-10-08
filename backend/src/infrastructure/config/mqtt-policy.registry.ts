/**
 * MQTT 策略工厂注册器
 * 
 * 负责管理多租户、多设备类型的策略解析器实例
 */

import { MqttPolicyResolver, DefaultMqttPolicyResolver } from '../../modules/bootstrap/strategies/mqtt-policy-resolver';
import { MqttConfigLoader } from './mqtt-config.loader';

/**
 * 策略解析器注册表
 */
export interface PolicyResolverRegistry {
  [tenantId: string]: {
    [deviceType: string]: MqttPolicyResolver;
  };
}

/**
 * 策略工厂注册器
 */
export class MqttPolicyRegistry {
  private static instance: MqttPolicyRegistry;
  private registry: PolicyResolverRegistry = {};
  private configLoader: MqttConfigLoader;
  private supportedDeviceTypes: string[] = [];

  constructor(configLoader?: MqttConfigLoader) {
    this.configLoader = configLoader || MqttConfigLoader.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(configLoader?: MqttConfigLoader): MqttPolicyRegistry {
    if (!MqttPolicyRegistry.instance) {
      MqttPolicyRegistry.instance = new MqttPolicyRegistry(configLoader);
    }
    return MqttPolicyRegistry.instance;
  }

  /**
   * 初始化注册器
   */
  async initialize(): Promise<void> {
    // 加载配置
    await this.configLoader.loadAllConfigs();
    
    // 获取支持的设备类型
    const topicSchema = this.configLoader.getTopicSchemaConfig();
    this.supportedDeviceTypes = Object.keys(topicSchema.device_types);
    
    console.log(`MQTT Policy Registry initialized with device types: ${this.supportedDeviceTypes.join(', ')}`);
  }

  /**
   * 注册租户的策略解析器
   */
  async registerTenantResolvers(tenantId: string, deviceTypes?: string[]): Promise<void> {
    const typesToRegister = deviceTypes || this.supportedDeviceTypes;
    
    if (!this.registry[tenantId]) {
      this.registry[tenantId] = {};
    }

    for (const deviceType of typesToRegister) {
      if (!this.registry[tenantId][deviceType]) {
        this.registry[tenantId][deviceType] = new DefaultMqttPolicyResolver(tenantId, deviceType);
        console.log(`Registered resolver for tenant: ${tenantId}, device type: ${deviceType}`);
      }
    }
  }

  /**
   * 获取策略解析器
   */
  getResolver(tenantId: string, deviceType: string): MqttPolicyResolver | null {
    return this.registry[tenantId]?.[deviceType] || null;
  }

  /**
   * 获取或创建策略解析器
   */
  async getOrCreateResolver(tenantId: string, deviceType: string): Promise<MqttPolicyResolver> {
    let resolver = this.getResolver(tenantId, deviceType);
    
    if (!resolver) {
      // 自动注册该租户和设备类型的解析器
      await this.registerTenantResolvers(tenantId, [deviceType]);
      resolver = this.getResolver(tenantId, deviceType);
    }
    
    if (!resolver) {
      throw new Error(`Failed to create resolver for tenant: ${tenantId}, device type: ${deviceType}`);
    }
    
    return resolver;
  }

  /**
   * 批量注册多个租户
   */
  async registerMultipleTenants(tenants: Array<{
    tenantId: string;
    deviceTypes?: string[];
  }>): Promise<void> {
    const promises = tenants.map(tenant => 
      this.registerTenantResolvers(tenant.tenantId, tenant.deviceTypes)
    );
    
    await Promise.all(promises);
    console.log(`Registered resolvers for ${tenants.length} tenants`);
  }

  /**
   * 获取租户的所有解析器
   */
  getTenantResolvers(tenantId: string): { [deviceType: string]: MqttPolicyResolver } | null {
    return this.registry[tenantId] || null;
  }

  /**
   * 获取所有已注册的租户
   */
  getRegisteredTenants(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * 获取租户支持的设备类型
   */
  getTenantDeviceTypes(tenantId: string): string[] {
    const tenantResolvers = this.getTenantResolvers(tenantId);
    return tenantResolvers ? Object.keys(tenantResolvers) : [];
  }

  /**
   * 检查租户是否已注册
   */
  isTenantRegistered(tenantId: string): boolean {
    return tenantId in this.registry;
  }

  /**
   * 检查设备类型是否支持
   */
  isDeviceTypeSupported(deviceType: string): boolean {
    return this.supportedDeviceTypes.includes(deviceType);
  }

  /**
   * 移除租户的所有解析器
   */
  removeTenant(tenantId: string): boolean {
    if (this.registry[tenantId]) {
      delete this.registry[tenantId];
      console.log(`Removed all resolvers for tenant: ${tenantId}`);
      return true;
    }
    return false;
  }

  /**
   * 移除特定租户和设备类型的解析器
   */
  removeResolver(tenantId: string, deviceType: string): boolean {
    if (this.registry[tenantId]?.[deviceType]) {
      delete this.registry[tenantId][deviceType];
      console.log(`Removed resolver for tenant: ${tenantId}, device type: ${deviceType}`);
      return true;
    }
    return false;
  }

  /**
   * 获取注册表统计信息
   */
  getRegistryStats(): {
    totalTenants: number;
    totalResolvers: number;
    deviceTypeDistribution: { [deviceType: string]: number };
    tenantDistribution: { [tenantId: string]: number };
  } {
    const stats = {
      totalTenants: 0,
      totalResolvers: 0,
      deviceTypeDistribution: {} as { [deviceType: string]: number },
      tenantDistribution: {} as { [tenantId: string]: number }
    };

    for (const [tenantId, tenantResolvers] of Object.entries(this.registry)) {
      stats.totalTenants++;
      const deviceTypes = Object.keys(tenantResolvers);
      stats.totalResolvers += deviceTypes.length;
      stats.tenantDistribution[tenantId] = deviceTypes.length;

      for (const deviceType of deviceTypes) {
        stats.deviceTypeDistribution[deviceType] = (stats.deviceTypeDistribution[deviceType] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 清理所有注册的解析器
   */
  clear(): void {
    this.registry = {};
    console.log('Cleared all policy resolvers');
  }

  /**
   * 重新加载配置并重建注册表
   */
  async reload(): Promise<void> {
    await this.configLoader.reloadConfigs();
    
    // 重建支持的设备类型列表
    const topicSchema = this.configLoader.getTopicSchemaConfig();
    this.supportedDeviceTypes = Object.keys(topicSchema.device_types);
    
    console.log('Policy registry reloaded with updated configuration');
  }

  /**
   * 预热注册表（预注册常用租户）
   */
  async warmup(commonTenants: string[] = ['default']): Promise<void> {
    console.log('Warming up policy registry...');
    
    const warmupPromises = commonTenants.map(tenantId => 
      this.registerTenantResolvers(tenantId)
    );
    
    await Promise.all(warmupPromises);
    console.log(`Policy registry warmed up for ${commonTenants.length} tenants`);
  }
}
