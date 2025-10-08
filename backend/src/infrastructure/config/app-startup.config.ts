/**
 * 应用启动配置
 * 
 * 负责在应用启动时加载MQTT配置和初始化策略注册器
 */

import { FastifyInstance } from 'fastify';
import { MqttConfigLoader } from '@/infrastructure/config/mqtt-config.loader';
import { MqttPolicyRegistry } from '@/infrastructure/config/mqtt-policy.registry';
import { BootstrapService } from '@/modules/bootstrap/bootstrap.service';
import { registerEmqxAclRoutes } from '@/routes/emqx-acl.routes';

/**
 * 启动配置选项
 */
export interface StartupConfigOptions {
  /** 配置文件路径 */
  configPath?: string;
  /** 是否启用EMQX ACL */
  enableEmqxAcl?: boolean;
  /** 预热的租户列表 */
  warmupTenants?: string[];
  /** 是否启用配置热重载 */
  enableHotReload?: boolean;
}

/**
 * 应用启动配置器
 */
export class AppStartupConfig {
  private configLoader: MqttConfigLoader;
  private policyRegistry: MqttPolicyRegistry;
  private bootstrapService: BootstrapService;
  private options: Required<StartupConfigOptions>;

  constructor(options: StartupConfigOptions = {}) {
    this.options = {
      configPath: options.configPath || 'configs/mqtt',
      enableEmqxAcl: options.enableEmqxAcl ?? true,
      warmupTenants: options.warmupTenants || ['default', 'demo', 'test'],
      enableHotReload: options.enableHotReload ?? false
    };

    this.configLoader = MqttConfigLoader.getInstance(this.options.configPath);
    this.policyRegistry = MqttPolicyRegistry.getInstance(this.configLoader);
    this.bootstrapService = new BootstrapService();
  }

  /**
   * 初始化应用配置
   */
  async initialize(fastify: FastifyInstance): Promise<void> {
    try {
      console.log('🚀 Initializing IoT Platform startup configuration...');

      // 1. 加载YAML配置文件
      console.log('📁 Loading MQTT configuration files...');
      await this.configLoader.loadAllConfigs();
      console.log('✅ MQTT configuration loaded successfully');

      // 2. 初始化策略注册器
      console.log('🔧 Initializing MQTT policy registry...');
      await this.policyRegistry.initialize();
      console.log('✅ MQTT policy registry initialized');

      // 3. 预热策略注册器
      console.log('🔥 Warming up policy registry...');
      await this.policyRegistry.warmup(this.options.warmupTenants);
      console.log(`✅ Policy registry warmed up for tenants: ${this.options.warmupTenants.join(', ')}`);

      // 4. 初始化Bootstrap服务
      console.log('🎯 Initializing Bootstrap service...');
      await this.bootstrapService.initialize();
      console.log('✅ Bootstrap service initialized');

      // 5. 注册EMQX ACL路由
      if (this.options.enableEmqxAcl) {
        console.log('🔐 Registering EMQX ACL routes...');
        await registerEmqxAclRoutes(fastify);
        console.log('✅ EMQX ACL routes registered');
      }

      // 6. 设置配置热重载（如果启用）
      if (this.options.enableHotReload) {
        this.setupHotReload();
      }

      // 7. 注册健康检查端点
      this.registerHealthCheck(fastify);

      console.log('🎉 IoT Platform startup configuration completed successfully!');
      
      // 输出注册表统计信息
      const stats = this.policyRegistry.getRegistryStats();
      console.log('📊 Policy Registry Stats:', {
        totalTenants: stats.totalTenants,
        totalResolvers: stats.totalResolvers,
        deviceTypeDistribution: stats.deviceTypeDistribution
      });

    } catch (error) {
      console.error('❌ Failed to initialize startup configuration:', error);
      throw error;
    }
  }

  /**
   * 设置配置热重载
   */
  private setupHotReload(): void {
    console.log('🔄 Setting up configuration hot reload...');
    
    // 监听配置文件变化
    const fs = require('fs');
    const path = require('path');
    
    const configDir = path.resolve(this.options.configPath);
    
    fs.watch(configDir, { recursive: true }, async (eventType: string, filename: string) => {
      if (filename && filename.endsWith('.yaml')) {
        console.log(`📝 Configuration file changed: ${filename}`);
        try {
          await this.configLoader.reloadConfigs();
          await this.policyRegistry.reload();
          console.log('✅ Configuration reloaded successfully');
        } catch (error) {
          console.error('❌ Failed to reload configuration:', error);
        }
      }
    });
    
    console.log('✅ Configuration hot reload enabled');
  }

  /**
   * 注册健康检查端点
   */
  private registerHealthCheck(fastify: FastifyInstance): void {
    fastify.get('/health', async (request, reply) => {
      try {
        const stats = this.policyRegistry.getRegistryStats();
        const configLoaded = this.configLoader.isConfigLoaded();
        
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            configLoader: configLoaded ? 'loaded' : 'not_loaded',
            policyRegistry: 'active',
            bootstrapService: 'active'
          },
          stats: {
            totalTenants: stats.totalTenants,
            totalResolvers: stats.totalResolvers,
            registeredTenants: this.policyRegistry.getRegisteredTenants()
          }
        };
      } catch (error) {
        reply.code(500);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    fastify.get('/health/config', async (request, reply) => {
      try {
        const qosConfig = this.configLoader.getQosPolicyConfig();
        const aclConfig = this.configLoader.getAclPolicyConfig();
        const topicConfig = this.configLoader.getTopicSchemaConfig();
        
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          configs: {
            qosPolicy: {
              deviceTypes: Object.keys(qosConfig.device_types),
              global: qosConfig.global
            },
            aclPolicy: {
              baseRules: aclConfig.base_rules,
              deviceTypeRules: Object.keys(aclConfig.device_type_rules),
              tenantRules: Object.keys(aclConfig.tenant_rules)
            },
            topicSchema: {
              channels: Object.keys(topicConfig.channels),
              deviceTypes: Object.keys(topicConfig.device_types)
            }
          }
        };
      } catch (error) {
        reply.code(500);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    console.log('✅ Health check endpoints registered');
  }

  /**
   * 获取配置加载器实例
   */
  getConfigLoader(): MqttConfigLoader {
    return this.configLoader;
  }

  /**
   * 获取策略注册器实例
   */
  getPolicyRegistry(): MqttPolicyRegistry {
    return this.policyRegistry;
  }

  /**
   * 获取Bootstrap服务实例
   */
  getBootstrapService(): BootstrapService {
    return this.bootstrapService;
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down startup configuration...');
      
      // 清理策略注册器
      this.policyRegistry.clear();
      
      console.log('✅ Startup configuration shutdown completed');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

/**
 * 创建启动配置实例
 */
export function createStartupConfig(options?: StartupConfigOptions): AppStartupConfig {
  return new AppStartupConfig(options);
}
