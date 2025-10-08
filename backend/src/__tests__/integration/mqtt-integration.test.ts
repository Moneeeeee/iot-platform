/**
 * MQTT 集成测试
 * 
 * 测试完整的MQTT配置生成和策略解析流程
 */

import { MqttConfigLoader } from '@/infrastructure/config/mqtt-config.loader';
import { MqttPolicyRegistry } from '@/infrastructure/config/mqtt-policy.registry';
import { BootstrapService } from '@/modules/bootstrap/bootstrap.service';
import { DeviceBootstrapRequest } from '@/modules/bootstrap/types';

describe('MQTT Integration Tests', () => {
  let configLoader: MqttConfigLoader;
  let policyRegistry: MqttPolicyRegistry;
  let bootstrapService: BootstrapService;

  beforeAll(async () => {
    // 初始化配置加载器
    configLoader = MqttConfigLoader.getInstance('configs/mqtt');
    await configLoader.loadAllConfigs();

    // 初始化策略注册器
    policyRegistry = MqttPolicyRegistry.getInstance(configLoader);
    await policyRegistry.initialize();

    // 初始化Bootstrap服务
    bootstrapService = new BootstrapService();
    await bootstrapService.initialize();
  });

  describe('Configuration Loading', () => {
    it('should load all configuration files successfully', () => {
      expect(configLoader.isConfigLoaded()).toBe(true);
      
      const qosConfig = configLoader.getQosPolicyConfig();
      const aclConfig = configLoader.getAclPolicyConfig();
      const topicConfig = configLoader.getTopicSchemaConfig();

      expect(qosConfig).toBeDefined();
      expect(aclConfig).toBeDefined();
      expect(topicConfig).toBeDefined();
    });

    it('should validate topic format correctly', () => {
      const validTopic = 'iot/tenant1/sensor/device1/telemetry';
      const invalidTopic = 'invalid/topic/format';

      const validResult = configLoader.validateTopic(validTopic);
      const invalidResult = configLoader.validateTopic(invalidTopic);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Policy Registry', () => {
    it('should register and retrieve resolvers correctly', async () => {
      const tenantId = 'test-tenant';
      const deviceType = 'sensor';

      // 注册解析器
      await policyRegistry.registerTenantResolvers(tenantId, [deviceType]);

      // 获取解析器
      const resolver = policyRegistry.getResolver(tenantId, deviceType);
      expect(resolver).toBeDefined();

      // 检查注册状态
      expect(policyRegistry.isTenantRegistered(tenantId)).toBe(true);
      expect(policyRegistry.getTenantDeviceTypes(tenantId)).toContain(deviceType);
    });

    it('should get registry statistics', () => {
      const stats = policyRegistry.getRegistryStats();
      
      expect(stats).toHaveProperty('totalTenants');
      expect(stats).toHaveProperty('totalResolvers');
      expect(stats).toHaveProperty('deviceTypeDistribution');
      expect(stats).toHaveProperty('tenantDistribution');
    });
  });

  describe('Bootstrap Service Integration', () => {
    it('should generate MQTT config using new policy system', async () => {
      const request: DeviceBootstrapRequest = {
        deviceId: 'test-device-001',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: {
          current: '1.0.0',
          build: '001',
          minRequired: '1.0.0',
          channel: 'stable'
        },
        hardware: {
          version: 'v1.0',
          serial: 'HW123'
        },
        capabilities: [
          { name: 'low_power_mode', version: '1.0' }
        ],
        tenantId: 'test-tenant',
        timestamp: Date.now()
      };

      const response = await bootstrapService.processBootstrapRequest(request, 'test-tenant');
      
      expect(response.code).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.mqtt).toBeDefined();
      
      // 验证MQTT配置结构
      const mqttConfig = response.data.mqtt;
      expect(mqttConfig.topics).toBeDefined();
      expect(mqttConfig.acl).toBeDefined();
      expect(mqttConfig.qosRetainPolicy).toBeDefined();
      
      // 验证主题格式
      expect(mqttConfig.topics.telemetryPub).toMatch(/^iot\/test-tenant\/sensor\/test-device-001\/telemetry$/);
      expect(mqttConfig.topics.statusPub).toMatch(/^iot\/test-tenant\/sensor\/test-device-001\/status$/);
      
      // 验证ACL权限
      expect(mqttConfig.acl.publish).toContain(mqttConfig.topics.telemetryPub);
      expect(mqttConfig.acl.subscribe).toContain(mqttConfig.topics.cmdSub);
    });

    it('should handle gateway device with subdevice topics', async () => {
      const gatewayRequest: DeviceBootstrapRequest = {
        deviceId: 'test-gateway-001',
        mac: 'BB:CC:DD:EE:FF:AA',
        deviceType: 'gateway',
        firmware: {
          current: '2.0.0',
          build: '002',
          minRequired: '2.0.0',
          channel: 'stable'
        },
        hardware: {
          version: 'v2.0',
          serial: 'GW123'
        },
        capabilities: [],
        tenantId: 'test-tenant',
        timestamp: Date.now()
      };

      const response = await bootstrapService.processBootstrapRequest(gatewayRequest, 'test-tenant');
      
      expect(response.code).toBe(200);
      
      const mqttConfig = response.data.mqtt;
      
      // 验证网关主题格式
      expect(mqttConfig.topics.telemetryPub).toMatch(/^iot\/test-tenant\/gateway\/test-gateway-001\/telemetry$/);
      
      // 验证网关ACL可能包含子设备权限
      expect(mqttConfig.acl.publish).toBeDefined();
      expect(mqttConfig.acl.subscribe).toBeDefined();
    });
  });

  describe('End-to-End Policy Resolution', () => {
    it('should resolve complete policy for different device types', async () => {
      const deviceTypes = ['sensor', 'gateway', 'controller'];
      const tenantId = 'e2e-tenant';

      for (const deviceType of deviceTypes) {
        const resolver = await policyRegistry.getOrCreateResolver(tenantId, deviceType);
        
        const request: DeviceBootstrapRequest = {
          deviceId: `e2e-${deviceType}-001`,
          mac: 'CC:DD:EE:FF:AA:BB',
          deviceType,
          firmware: {
            current: '1.0.0',
            build: '001',
            minRequired: '1.0.0',
            channel: 'stable'
          },
          hardware: {
            version: 'v1.0',
            serial: 'E2E123'
          },
          capabilities: [],
          tenantId,
          timestamp: Date.now()
        };

        const policy = await resolver.resolvePolicy(request, tenantId);
        
        expect(policy.topics).toBeDefined();
        expect(policy.acl).toBeDefined();
        expect(policy.qosRetainPolicy).toBeDefined();
        
        // 验证主题格式
        expect(policy.topics.telemetryPub).toMatch(new RegExp(`^iot/${tenantId}/${deviceType}/e2e-${deviceType}-001/telemetry$`));
        
        // 验证ACL权限
        expect(policy.acl.publish).toContain(policy.topics.telemetryPub);
        expect(policy.acl.subscribe).toContain(policy.topics.cmdSub);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid device type gracefully', async () => {
      const invalidRequest: DeviceBootstrapRequest = {
        deviceId: 'invalid-device',
        mac: 'DD:EE:FF:AA:BB:CC',
        deviceType: 'invalid_type' as any,
        firmware: {
          current: '1.0.0',
          build: '001',
          minRequired: '1.0.0',
          channel: 'stable'
        },
        hardware: {
          version: 'v1.0',
          serial: 'INV123'
        },
        capabilities: [],
        tenantId: 'test-tenant',
        timestamp: Date.now()
      };

      // 应该能够处理无效设备类型，使用默认策略
      const response = await bootstrapService.processBootstrapRequest(invalidRequest, 'test-tenant');
      expect(response.code).toBe(200);
    });

    it('should handle missing tenant gracefully', async () => {
      const request: DeviceBootstrapRequest = {
        deviceId: 'missing-tenant-device',
        mac: 'EE:FF:AA:BB:CC:DD',
        deviceType: 'sensor',
        firmware: {
          current: '1.0.0',
          build: '001',
          minRequired: '1.0.0',
          channel: 'stable'
        },
        hardware: {
          version: 'v1.0',
          serial: 'MISS123'
        },
        capabilities: [],
        tenantId: 'non-existent-tenant',
        timestamp: Date.now()
      };

      // 应该能够处理不存在的租户，自动创建解析器
      const response = await bootstrapService.processBootstrapRequest(request, 'non-existent-tenant');
      expect(response.code).toBe(200);
    });
  });

  afterAll(async () => {
    // 清理
    policyRegistry.clear();
  });
});
