/**
 * MQTT 主题策略服务测试
 * 
 * 测试主题生成、解析、验证等核心功能
 */

import { MqttTopicsStrategy } from '../../../../modules/bootstrap/strategies/mqtt-topics.strategy';

describe('MqttTopicsStrategy', () => {
  let strategy: MqttTopicsStrategy;
  const tenantId = 'test-tenant';
  const deviceType = 'sensor';
  const deviceId = 'test-device-001';

  beforeEach(() => {
    strategy = new MqttTopicsStrategy(tenantId, deviceType);
  });

  describe('构造函数和初始化', () => {
    it('should create strategy with correct tenant and device type', () => {
      expect(strategy).toBeDefined();
    });

    it('should normalize device type correctly', () => {
      const gatewayStrategy = new MqttTopicsStrategy(tenantId, 'GATEWAY');
      expect(gatewayStrategy).toBeDefined();
    });

    it('should handle unsupported device type', () => {
      const customStrategy = new MqttTopicsStrategy(tenantId, 'custom-device');
      expect(customStrategy).toBeDefined();
    });
  });

  describe('generateTopics', () => {
    it('should generate correct topic structure', () => {
      const topics = strategy.generateTopics(deviceId);

      // 验证基础主题结构
      expect(topics.telemetryPub).toBe(`iot/${tenantId}/${deviceType}/${deviceId}/telemetry`);
      expect(topics.statusPub).toBe(`iot/${tenantId}/${deviceType}/${deviceId}/status`);
      expect(topics.eventPub).toBe(`iot/${tenantId}/${deviceType}/${deviceId}/event`);
      expect(topics.cmdSub).toBe(`iot/${tenantId}/${deviceType}/${deviceId}/cmd`);
      expect(topics.cmdresPub).toBe(`iot/${tenantId}/${deviceType}/${deviceId}/cmdres`);
      expect(topics.shadowDesiredSub).toBe(`iot/${tenantId}/${deviceType}/${deviceId}/shadow/desired`);
      expect(topics.shadowReportedPub).toBe(`iot/${tenantId}/${deviceType}/${deviceId}/shadow/reported`);
      expect(topics.cfgSub).toBe(`iot/${tenantId}/${deviceType}/${deviceId}/cfg`);
      expect(topics.otaProgressPub).toBe(`iot/${tenantId}/${deviceType}/${deviceId}/ota/progress`);
    });

    it('should generate different topics for different devices', () => {
      const topics1 = strategy.generateTopics('device-001');
      const topics2 = strategy.generateTopics('device-002');

      expect(topics1.telemetryPub).not.toBe(topics2.telemetryPub);
      expect(topics1.telemetryPub).toContain('device-001');
      expect(topics2.telemetryPub).toContain('device-002');
    });

    it('should generate different topics for different tenants', () => {
      const strategy1 = new MqttTopicsStrategy('tenant-1', deviceType);
      const strategy2 = new MqttTopicsStrategy('tenant-2', deviceType);

      const topics1 = strategy1.generateTopics(deviceId);
      const topics2 = strategy2.generateTopics(deviceId);

      expect(topics1.telemetryPub).not.toBe(topics2.telemetryPub);
      expect(topics1.telemetryPub).toContain('tenant-1');
      expect(topics2.telemetryPub).toContain('tenant-2');
    });
  });

  describe('generateSubDeviceTopics', () => {
    it('should generate correct subdevice topic structure', () => {
      const gatewayStrategy = new MqttTopicsStrategy(tenantId, 'gateway');
      const subDeviceTopics = gatewayStrategy.generateSubDeviceTopics(
        'gateway-001',
        'sensor-001',
        'sensor'
      );

      expect(subDeviceTopics.telemetryPub).toBe(
        `iot/${tenantId}/gateway/gateway-001/subdev/sensor-001/telemetry`
      );
      expect(subDeviceTopics.statusPub).toBe(
        `iot/${tenantId}/gateway/gateway-001/subdev/sensor-001/status`
      );
      expect(subDeviceTopics.cmdSub).toBe(
        `iot/${tenantId}/gateway/gateway-001/subdev/sensor-001/cmd`
      );
    });

    it('should handle multiple subdevices correctly', () => {
      const gatewayStrategy = new MqttTopicsStrategy(tenantId, 'gateway');
      
      const subDevice1Topics = gatewayStrategy.generateSubDeviceTopics(
        'gateway-001', 'sensor-001', 'sensor'
      );
      const subDevice2Topics = gatewayStrategy.generateSubDeviceTopics(
        'gateway-001', 'sensor-002', 'sensor'
      );

      expect(subDevice1Topics.telemetryPub).not.toBe(subDevice2Topics.telemetryPub);
      expect(subDevice1Topics.telemetryPub).toContain('sensor-001');
      expect(subDevice2Topics.telemetryPub).toContain('sensor-002');
    });
  });

  describe('parseTopicPath', () => {
    it('should parse valid topic path correctly', () => {
      const topicPath = `iot/${tenantId}/${deviceType}/${deviceId}/telemetry`;
      const parsed = strategy.parseTopicPath(topicPath);

      expect(parsed).not.toBeNull();
      expect(parsed!.prefix).toBe(`iot/${tenantId}/${deviceType}/${deviceId}`);
      expect(parsed!.deviceType).toBe(deviceType);
      expect(parsed!.deviceId).toBe(deviceId);
      expect(parsed!.channel).toBe('telemetry');
    });

    it('should parse topic path with subchannel', () => {
      const topicPath = `iot/${tenantId}/${deviceType}/${deviceId}/shadow/desired`;
      const parsed = strategy.parseTopicPath(topicPath);

      expect(parsed).not.toBeNull();
      expect(parsed!.channel).toBe('shadow');
      expect(parsed!.subchannel).toBe('desired');
    });

    it('should return null for invalid topic path', () => {
      const invalidPaths = [
        'invalid/topic/path',
        'iot/invalid',
        'iot/tenant/device/',
        'iot/tenant/device/id/channel/extra/invalid'
      ];

      invalidPaths.forEach(path => {
        const parsed = strategy.parseTopicPath(path);
        expect(parsed).toBeNull();
      });
    });
  });

  describe('validateTopicOwnership', () => {
    it('should validate correct topic ownership', () => {
      const topicPath = `iot/${tenantId}/${deviceType}/${deviceId}/telemetry`;
      const isValid = strategy.validateTopicOwnership(topicPath, deviceId);

      expect(isValid).toBe(true);
    });

    it('should reject topic with different device ID', () => {
      const topicPath = `iot/${tenantId}/${deviceType}/different-device/telemetry`;
      const isValid = strategy.validateTopicOwnership(topicPath, deviceId);

      expect(isValid).toBe(false);
    });

    it('should reject topic with different tenant', () => {
      const topicPath = `iot/different-tenant/${deviceType}/${deviceId}/telemetry`;
      const isValid = strategy.validateTopicOwnership(topicPath, deviceId);

      expect(isValid).toBe(false);
    });
  });

  describe('静态方法', () => {
    it('should return supported device types', () => {
      const supportedTypes = MqttTopicsStrategy.getSupportedDeviceTypes();
      
      expect(supportedTypes).toContain('ps-ctrl');
      expect(supportedTypes).toContain('dtu');
      expect(supportedTypes).toContain('rtu');
      expect(supportedTypes).toContain('ftu');
      expect(supportedTypes).toContain('sensor');
      expect(supportedTypes).toContain('gateway');
    });

    it('should validate device type support', () => {
      expect(MqttTopicsStrategy.isDeviceTypeSupported('sensor')).toBe(true);
      expect(MqttTopicsStrategy.isDeviceTypeSupported('gateway')).toBe(true);
      expect(MqttTopicsStrategy.isDeviceTypeSupported('custom-device')).toBe(false);
    });
  });
});
