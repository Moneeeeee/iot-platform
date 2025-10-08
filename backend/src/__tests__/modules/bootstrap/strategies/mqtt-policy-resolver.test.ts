/**
 * MQTT 策略解析器测试
 * 
 * 测试统一接口、工厂模式、子设备策略等核心功能
 */

import { 
  DefaultMqttPolicyResolver, 
  MqttPolicyFactory, 
  MqttPolicyResolver 
} from '../../../../modules/bootstrap/strategies/mqtt-policy-resolver';
import { DeviceBootstrapRequest } from '../../../../modules/bootstrap/types';

describe('DefaultMqttPolicyResolver', () => {
  let resolver: MqttPolicyResolver;
  const tenantId = 'test-tenant';
  const deviceType = 'sensor';

  beforeEach(() => {
    resolver = new DefaultMqttPolicyResolver(tenantId, deviceType);
  });

  describe('策略解析', () => {
    it('should resolve policy correctly', async () => {
      const request: DeviceBootstrapRequest = {
        deviceId: 'test-device',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId,
        timestamp: Date.now()
      };

      const result = await resolver.resolvePolicy(request, tenantId);
      
      expect(result).toBeDefined();
      expect(result.topics).toBeDefined();
      expect(result.qosRetainPolicy).toBeDefined();
      expect(result.acl).toBeDefined();
      expect(result.capabilities).toBeDefined();
    });

    it('should handle different device types', async () => {
      const gatewayResolver = new DefaultMqttPolicyResolver(tenantId, 'gateway');
      const request: DeviceBootstrapRequest = {
        deviceId: 'test-gateway',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'gateway',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId,
        timestamp: Date.now()
      };

      const result = await gatewayResolver.resolvePolicy(request, tenantId);
      
      expect(result).toBeDefined();
      expect(result.capabilities.isGateway).toBe(true);
    });
  });

  describe('主题权限验证', () => {
    it('should validate topic permissions correctly', () => {
      const deviceId = 'test-device';
      
      // 验证有效权限
      expect(resolver.validateTopicPermission(
        `iot/${tenantId}/sensor/${deviceId}/telemetry`,
        'publish',
        deviceId
      )).toBe(true);

      expect(resolver.validateTopicPermission(
        `iot/${tenantId}/sensor/${deviceId}/cmd`,
        'subscribe',
        deviceId
      )).toBe(true);

      // 验证无效权限
      expect(resolver.validateTopicPermission(
        `iot/${tenantId}/sensor/other-device/telemetry`,
        'publish',
        deviceId
      )).toBe(false);
    });
  });

  describe('子设备策略生成', () => {
    it('should generate subdevice policy correctly', async () => {
      const gatewayDeviceId = 'test-gateway';
      const subDeviceId = 'sensor-001';
      const subDeviceType = 'sensor';

      const result = await resolver.generateSubDevicePolicy(
        gatewayDeviceId,
        subDeviceId,
        subDeviceType,
        tenantId
      );

      expect(result).toBeDefined();
      expect(result.topics).toBeDefined();
      expect(result.capabilities).toBeDefined();
      
      // 验证子设备主题结构
      expect(result.topics.telemetryPub).toContain('subdev/sensor-001');
      expect(result.topics.statusPub).toContain('subdev/sensor-001');
    });

    it('should handle different subdevice types', async () => {
      const gatewayDeviceId = 'test-gateway';
      const subDeviceId = 'rtu-001';
      const subDeviceType = 'rtu';

      const result = await resolver.generateSubDevicePolicy(
        gatewayDeviceId,
        subDeviceId,
        subDeviceType,
        tenantId
      );

      expect(result).toBeDefined();
      expect(result.topics.telemetryPub).toContain('subdev/rtu-001');
      
      // RTU设备应该有不同的能力配置
      expect(result.capabilities.isLowPower).toBe(false);
    });

    it('should handle multiple subdevices of same type', async () => {
      const gatewayDeviceId = 'test-gateway';
      
      const result1 = await resolver.generateSubDevicePolicy(
        gatewayDeviceId, 'sensor-001', 'sensor', tenantId
      );
      const result2 = await resolver.generateSubDevicePolicy(
        gatewayDeviceId, 'sensor-002', 'sensor', tenantId
      );

      expect(result1.topics.telemetryPub).not.toBe(result2.topics.telemetryPub);
      expect(result1.topics.telemetryPub).toContain('sensor-001');
      expect(result2.topics.telemetryPub).toContain('sensor-002');
    });
  });
});

describe('MqttPolicyFactory', () => {
  describe('创建策略解析器', () => {
    it('should create resolver correctly', () => {
      const resolver = MqttPolicyFactory.createResolver('test-tenant', 'sensor');
      
      expect(resolver).toBeDefined();
      expect(resolver).toBeInstanceOf(DefaultMqttPolicyResolver);
    });

    it('should create resolvers for different device types', () => {
      const sensorResolver = MqttPolicyFactory.createResolver('test-tenant', 'sensor');
      const gatewayResolver = MqttPolicyFactory.createResolver('test-tenant', 'gateway');
      
      expect(sensorResolver).toBeDefined();
      expect(gatewayResolver).toBeDefined();
      expect(sensorResolver).not.toBe(gatewayResolver);
    });
  });

  describe('批量创建策略解析器', () => {
    it('should create multiple resolvers correctly', () => {
      const deviceTypes = ['sensor', 'gateway', 'ps-ctrl', 'dtu'];
      const resolvers = MqttPolicyFactory.createResolvers('test-tenant', deviceTypes);
      
      expect(resolvers).toBeInstanceOf(Map);
      expect(resolvers.size).toBe(deviceTypes.length);
      
      deviceTypes.forEach(deviceType => {
        expect(resolvers.has(deviceType)).toBe(true);
        expect(resolvers.get(deviceType)).toBeDefined();
      });
    });

    it('should handle empty device types array', () => {
      const resolvers = MqttPolicyFactory.createResolvers('test-tenant', []);
      
      expect(resolvers).toBeInstanceOf(Map);
      expect(resolvers.size).toBe(0);
    });

    it('should handle duplicate device types', () => {
      const deviceTypes = ['sensor', 'sensor', 'gateway'];
      const resolvers = MqttPolicyFactory.createResolvers('test-tenant', deviceTypes);
      
      expect(resolvers.size).toBe(2); // 去重后只有2个
      expect(resolvers.has('sensor')).toBe(true);
      expect(resolvers.has('gateway')).toBe(true);
    });
  });

  describe('工厂模式验证', () => {
    it('should create independent resolver instances', () => {
      const resolver1 = MqttPolicyFactory.createResolver('tenant-1', 'sensor');
      const resolver2 = MqttPolicyFactory.createResolver('tenant-2', 'sensor');
      
      expect(resolver1).not.toBe(resolver2);
    });

    it('should handle different tenants correctly', () => {
      const tenant1Resolvers = MqttPolicyFactory.createResolvers('tenant-1', ['sensor']);
      const tenant2Resolvers = MqttPolicyFactory.createResolvers('tenant-2', ['sensor']);
      
      const tenant1Resolver = tenant1Resolvers.get('sensor');
      const tenant2Resolver = tenant2Resolvers.get('sensor');
      
      expect(tenant1Resolver).not.toBe(tenant2Resolver);
    });
  });
});

describe('集成测试', () => {
  it('should work end-to-end with real device request', async () => {
    const resolver = MqttPolicyFactory.createResolver('test-tenant', 'sensor');
    
    const request: DeviceBootstrapRequest = {
      deviceId: 'real-device-001',
      mac: 'AA:BB:CC:DD:EE:FF',
      deviceType: 'sensor',
      firmware: { 
        current: '1.2.3', 
        build: '20241201.001', 
        minRequired: '1.0.0',
        channel: 'stable'
      },
      hardware: { 
        version: 'v2.1', 
        serial: 'HW789012' 
      },
      capabilities: [
        { name: 'temperature_sensor' },
        { name: 'humidity_sensor' },
        { name: 'low_power_mode' }
      ],
      tenantId: 'test-tenant',
      timestamp: Date.now(),
      signature: 'test-signature'
    };

    // 解析策略
    const policy = await resolver.resolvePolicy(request, 'test-tenant');
    
    // 验证主题结构
    expect(policy.topics.telemetryPub).toBe('iot/test-tenant/sensor/real-device-001/telemetry');
    expect(policy.topics.statusPub).toBe('iot/test-tenant/sensor/real-device-001/status');
    
    // 验证QoS策略（低功耗设备）
    const telemetryPolicy = policy.qosRetainPolicy.find(p => p.topic.includes('/telemetry'));
    expect(telemetryPolicy?.qos).toBe(0); // 低功耗设备使用QoS0
    
    // 验证ACL权限
    expect(policy.acl.publish).toContain('iot/test-tenant/sensor/real-device-001/telemetry');
    expect(policy.acl.subscribe).toContain('iot/test-tenant/sensor/real-device-001/cmd');
    
    // 验证能力检测
    expect(policy.capabilities.isLowPower).toBe(true);
    expect(policy.capabilities.hasSensors).toBe(true);
    
    // 验证权限检查
    expect(resolver.validateTopicPermission(
      'iot/test-tenant/sensor/real-device-001/telemetry',
      'publish',
      'real-device-001'
    )).toBe(true);
  });

  it('should handle gateway with subdevices correctly', async () => {
    const gatewayResolver = MqttPolicyFactory.createResolver('test-tenant', 'gateway');
    
    const gatewayRequest: DeviceBootstrapRequest = {
      deviceId: 'gateway-001',
      mac: 'BB:CC:DD:EE:FF:00',
      deviceType: 'gateway',
      firmware: { current: '2.0.0', build: '20241201.002', minRequired: '1.5.0' },
      hardware: { version: 'v3.0', serial: 'GW123456' },
      capabilities: [
        { name: 'subdevice_support' },
        { name: 'data_aggregation' }
      ],
      tenantId: 'test-tenant',
      timestamp: Date.now()
    };

    // 解析网关策略
    const gatewayPolicy = await gatewayResolver.resolvePolicy(gatewayRequest, 'test-tenant');
    
    // 验证网关有子设备权限
    expect(gatewayPolicy.acl.publish).toContain('iot/test-tenant/gateway/gateway-001/subdev/+/telemetry');
    expect(gatewayPolicy.acl.subscribe).toContain('iot/test-tenant/gateway/gateway-001/subdev/+/cmd');
    
    // 生成子设备策略
    const subDevicePolicy = await gatewayResolver.generateSubDevicePolicy(
      'gateway-001',
      'sensor-001',
      'sensor',
      'test-tenant'
    );
    
    // 验证子设备主题
    expect(subDevicePolicy.topics.telemetryPub).toBe(
      'iot/test-tenant/gateway/gateway-001/subdev/sensor-001/telemetry'
    );
  });
});
