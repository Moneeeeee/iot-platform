/**
 * MQTT 策略服务测试
 * 
 * 测试QoS/Retain策略、ACL权限、设备能力检测等核心功能
 */

import { MqttPolicyStrategy } from '../../../../modules/bootstrap/strategies/mqtt-policy.strategy';
import { DeviceBootstrapRequest } from '../../../../modules/bootstrap/types';

describe('MqttPolicyStrategy', () => {
  let strategy: MqttPolicyStrategy;
  const tenantId = 'test-tenant';
  const deviceType = 'sensor';

  beforeEach(() => {
    strategy = new MqttPolicyStrategy(tenantId, deviceType);
  });

  describe('设备能力检测', () => {
    it('should detect low power device correctly', () => {
      const lowPowerRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [{ name: 'low_power_mode' }],
        tenantId,
        timestamp: Date.now()
      };

      const capabilities = (strategy as any).detectDeviceCapabilities(lowPowerRequest);
      expect(capabilities.isLowPower).toBe(true);
    });

    it('should detect sensor device as low power by default', () => {
      const sensorRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId,
        timestamp: Date.now()
      };

      const capabilities = (strategy as any).detectDeviceCapabilities(sensorRequest);
      expect(capabilities.isLowPower).toBe(true);
    });

    it('should detect gateway device correctly', () => {
      const gatewayStrategy = new MqttPolicyStrategy(tenantId, 'gateway');
      const gatewayRequest: DeviceBootstrapRequest = {
        deviceId: 'test-gateway',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'gateway',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId,
        timestamp: Date.now()
      };

      const capabilities = (gatewayStrategy as any).detectDeviceCapabilities(gatewayRequest);
      expect(capabilities.isGateway).toBe(true);
      expect(capabilities.isLowPower).toBe(false);
    });

    it('should detect sensor capabilities', () => {
      const sensorRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [
          { name: 'temperature_sensor' },
          { name: 'humidity_sensor' }
        ],
        tenantId,
        timestamp: Date.now()
      };

      const capabilities = (strategy as any).detectDeviceCapabilities(sensorRequest);
      expect(capabilities.hasSensors).toBe(true);
    });
  });

  describe('QoS/Retain策略生成', () => {
    it('should generate correct QoS policy for low power device', async () => {
      const lowPowerRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [{ name: 'low_power_mode' }],
        tenantId,
        timestamp: Date.now()
      };

      const result = await strategy.resolvePolicy(lowPowerRequest, tenantId);
      
      // 低功耗设备的遥测数据应该使用QoS0
      const telemetryPolicy = result.qosRetainPolicy.find((p: any) => p.topic.includes('/telemetry'));
      expect(telemetryPolicy?.qos).toBe(0);
      expect(telemetryPolicy?.retain).toBe(false);
      expect(telemetryPolicy?.reason).toBe('low_power_optimization');

      // 状态数据仍然使用QoS1和Retain
      const statusPolicy = result.qosRetainPolicy.find((p: any) => p.topic.includes('/status'));
      expect(statusPolicy?.qos).toBe(1);
      expect(statusPolicy?.retain).toBe(true);
    });

    it('should generate correct QoS policy for gateway device', async () => {
      const gatewayStrategy = new MqttPolicyStrategy(tenantId, 'gateway');
      const gatewayRequest: DeviceBootstrapRequest = {
        deviceId: 'test-gateway',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'gateway',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId,
        timestamp: Date.now()
      };

      const result = await gatewayStrategy.resolvePolicy(gatewayRequest, tenantId);
      
      // 网关设备的遥测数据使用QoS1
      const telemetryPolicy = result.qosRetainPolicy.find((p: any) => p.topic.includes('/telemetry'));
      expect(telemetryPolicy?.qos).toBe(1);
      expect(telemetryPolicy?.reason).toBe('standard_telemetry');
    });

    it('should generate correct QoS policy for all channels', async () => {
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

      const result = await strategy.resolvePolicy(request, tenantId);
      
      // 验证所有通道都有对应的QoS策略
      expect(result.qosRetainPolicy).toHaveLength(9); // 9个主题通道
      
      // 验证关键通道的策略
      const policies = result.qosRetainPolicy;
      expect(policies.some((p: any) => p.topic.includes('/telemetry'))).toBe(true);
      expect(policies.some((p: any) => p.topic.includes('/status'))).toBe(true);
      expect(policies.some((p: any) => p.topic.includes('/event'))).toBe(true);
      expect(policies.some((p: any) => p.topic.includes('/cmd'))).toBe(true);
      expect(policies.some((p: any) => p.topic.includes('/shadow/desired'))).toBe(true);
      expect(policies.some((p: any) => p.topic.includes('/shadow/reported'))).toBe(true);
    });
  });

  describe('ACL权限生成', () => {
    it('should generate correct ACL for sensor device', async () => {
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

      const result = await strategy.resolvePolicy(request, tenantId);
      
      // 验证发布权限
      expect(result.acl.publish).toContain(`iot/${tenantId}/sensor/test-device/telemetry`);
      expect(result.acl.publish).toContain(`iot/${tenantId}/sensor/test-device/status`);
      expect(result.acl.publish).toContain(`iot/${tenantId}/sensor/test-device/event`);
      expect(result.acl.publish).toContain(`iot/${tenantId}/sensor/test-device/cmdres`);
      expect(result.acl.publish).toContain(`iot/${tenantId}/sensor/test-device/shadow/reported`);
      expect(result.acl.publish).toContain(`iot/${tenantId}/sensor/test-device/ota/progress`);

      // 验证订阅权限
      expect(result.acl.subscribe).toContain(`iot/${tenantId}/sensor/test-device/cmd`);
      expect(result.acl.subscribe).toContain(`iot/${tenantId}/sensor/test-device/shadow/desired`);
      expect(result.acl.subscribe).toContain(`iot/${tenantId}/sensor/test-device/cfg`);

      // 验证拒绝权限
      expect(result.acl.deny).toContain('iot/+/+/+/admin/+');
      expect(result.acl.deny).toContain('iot/+/+/+/system/+');
      expect(result.acl.deny).toContain('iot/+/+/+/debug/+');
    });

    it('should generate additional ACL for gateway device', async () => {
      const gatewayStrategy = new MqttPolicyStrategy(tenantId, 'gateway');
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

      const result = await gatewayStrategy.resolvePolicy(request, tenantId);
      
      // 网关应该有子设备相关的权限
      expect(result.acl.publish).toContain(`iot/${tenantId}/gateway/test-gateway/subdev/+/telemetry`);
      expect(result.acl.publish).toContain(`iot/${tenantId}/gateway/test-gateway/subdev/+/status`);
      expect(result.acl.subscribe).toContain(`iot/${tenantId}/gateway/test-gateway/subdev/+/cmd`);
    });
  });

  describe('主题权限验证', () => {
    it('should validate correct topic permissions', () => {
      const deviceId = 'test-device';
      
      // 验证发布权限
      expect(strategy.validateTopicPermission(
        `iot/${tenantId}/sensor/${deviceId}/telemetry`,
        'publish',
        deviceId
      )).toBe(true);

      expect(strategy.validateTopicPermission(
        `iot/${tenantId}/sensor/${deviceId}/status`,
        'publish',
        deviceId
      )).toBe(true);

      // 验证订阅权限
      expect(strategy.validateTopicPermission(
        `iot/${tenantId}/sensor/${deviceId}/cmd`,
        'subscribe',
        deviceId
      )).toBe(true);

      expect(strategy.validateTopicPermission(
        `iot/${tenantId}/sensor/${deviceId}/shadow/desired`,
        'subscribe',
        deviceId
      )).toBe(true);
    });

    it('should reject invalid topic permissions', () => {
      const deviceId = 'test-device';
      
      // 拒绝其他设备的主题
      expect(strategy.validateTopicPermission(
        `iot/${tenantId}/sensor/other-device/telemetry`,
        'publish',
        deviceId
      )).toBe(false);

      // 拒绝其他租户的主题
      expect(strategy.validateTopicPermission(
        `iot/other-tenant/sensor/${deviceId}/telemetry`,
        'publish',
        deviceId
      )).toBe(false);

      // 拒绝管理主题
      expect(strategy.validateTopicPermission(
        `iot/${tenantId}/sensor/${deviceId}/admin/config`,
        'publish',
        deviceId
      )).toBe(false);
    });

    it('should handle wildcard patterns correctly', () => {
      const deviceId = 'test-device';
      
      // 通配符模式应该被正确处理
      expect(strategy.validateTopicPermission(
        `iot/${tenantId}/sensor/${deviceId}/telemetry`,
        'publish',
        deviceId
      )).toBe(true);
    });
  });

  describe('设备类型特定策略', () => {
    it('should return correct QoS policy for sensor', () => {
      const policy = strategy.getDeviceTypeQosPolicy('sensor');
      expect(policy.defaultQos).toBe(0);
      expect(policy.allowRetain).toBe(false);
    });

    it('should return correct QoS policy for gateway', () => {
      const policy = strategy.getDeviceTypeQosPolicy('gateway');
      expect(policy.defaultQos).toBe(1);
      expect(policy.allowRetain).toBe(true);
    });

    it('should return correct QoS policy for control devices', () => {
      const controlDevices = ['ps-ctrl', 'dtu', 'rtu', 'ftu'];
      
      controlDevices.forEach(deviceType => {
        const policy = strategy.getDeviceTypeQosPolicy(deviceType);
        expect(policy.defaultQos).toBe(1);
        expect(policy.allowRetain).toBe(true);
      });
    });

    it('should return default policy for unknown device type', () => {
      const policy = strategy.getDeviceTypeQosPolicy('unknown-device');
      expect(policy.defaultQos).toBe(1);
      expect(policy.allowRetain).toBe(true);
    });
  });

  describe('通配符转换', () => {
    it('should convert wildcard patterns to regex correctly', () => {
      const convertWildcardToRegex = (strategy as any).convertWildcardToRegex;
      
      // 测试单级通配符
      const singleLevelRegex = convertWildcardToRegex('iot/+/+/+/telemetry');
      expect(singleLevelRegex.test('iot/tenant/sensor/device/telemetry')).toBe(true);
      expect(singleLevelRegex.test('iot/tenant/sensor/device/status')).toBe(false);
      
      // 测试多级通配符
      const multiLevelRegex = convertWildcardToRegex('iot/+/+/+/shadow/+');
      expect(multiLevelRegex.test('iot/tenant/sensor/device/shadow/desired')).toBe(true);
      expect(multiLevelRegex.test('iot/tenant/sensor/device/shadow/reported')).toBe(true);
    });
  });

  describe('完整策略解析', () => {
    it('should resolve complete policy correctly', async () => {
      const request: DeviceBootstrapRequest = {
        deviceId: 'test-device',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [{ name: 'temperature_sensor' }],
        tenantId,
        timestamp: Date.now()
      };

      const result = await strategy.resolvePolicy(request, tenantId);
      
      // 验证返回结构
      expect(result.topics).toBeDefined();
      expect(result.qosRetainPolicy).toBeDefined();
      expect(result.acl).toBeDefined();
      expect(result.capabilities).toBeDefined();
      
      // 验证能力检测结果
      expect(result.capabilities.isLowPower).toBe(true);
      expect(result.capabilities.hasSensors).toBe(true);
      expect(result.capabilities.isGateway).toBe(false);
      expect(result.capabilities.supportsOta).toBe(true);
      expect(result.capabilities.supportsShadow).toBe(true);
    });
  });
});
