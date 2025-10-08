/**
 * BootstrapService 单元测试
 * 
 * 测试设备引导服务的核心功能，包括：
 * 1. MQTT 配置生成
 * 2. OTA 配置生成
 * 3. 影子期望状态生成
 * 4. 策略配置生成
 * 5. 错误处理
 */

import { BootstrapService } from '@/modules/bootstrap/bootstrap.service';
import { DeviceBootstrapRequest } from '@/modules/bootstrap/types';
import { getPrismaClient } from '@/infrastructure/db/prisma';
import { CacheService } from '@/infrastructure/cache/redis';

// Mock 依赖
jest.mock('@/infrastructure/db/prisma');
jest.mock('@/infrastructure/cache/redis');
jest.mock('@/infrastructure/config/mqtt-policy.registry');
jest.mock('@/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    MQTT_BROKER_URL: 'mqtt://localhost:1883',
    NODE_ENV: 'test',
    PUBLIC_ORIGIN: 'http://localhost:8000',
    WS_PATH: '/ws'
  }
}));

describe('BootstrapService', () => {
  let bootstrapService: BootstrapService;
  let mockPrisma: any;
  let mockCache: any;

  beforeEach(async () => {
    // 重置所有 mock
    jest.clearAllMocks();
    
    // Mock Prisma
    mockPrisma = {
      device: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      tenant: {
        findUnique: jest.fn()
      }
    };
    (getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);

    // Mock Cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    (CacheService as jest.Mock).mockImplementation(() => mockCache);

    // 创建服务实例
    bootstrapService = new BootstrapService({
      defaultPasswordExpiryHours: 24,
      defaultSessionExpiryHours: 168,
      defaultKeepaliveSeconds: 60
    });

    // Mock 策略注册器
    const mockPolicyRegistry = {
      initialize: jest.fn().mockResolvedValue(undefined),
      warmup: jest.fn().mockResolvedValue(undefined),
      getOrCreateResolver: jest.fn().mockReturnValue({
        resolvePolicy: jest.fn().mockResolvedValue({
          topics: {
            telemetryPub: 'iot/default/sensor/test-device-001/telemetry',
            statusPub: 'iot/default/sensor/test-device-001/status',
            eventPub: 'iot/default/sensor/test-device-001/event',
            cmdSub: 'iot/default/sensor/test-device-001/cmd',
            cmdresPub: 'iot/default/sensor/test-device-001/cmdres',
            shadowDesiredSub: 'iot/default/sensor/test-device-001/shadow/desired',
            shadowReportedPub: 'iot/default/sensor/test-device-001/shadow/reported',
            cfgSub: 'iot/default/sensor/test-device-001/cfg',
            otaProgressPub: 'iot/default/sensor/test-device-001/ota/progress'
          },
          qosRetainPolicy: [
            { topic: 'iot/default/sensor/test-device-001/telemetry', qos: 1, retain: false },
            { topic: 'iot/default/sensor/test-device-001/status', qos: 1, retain: true },
            { topic: 'iot/default/sensor/test-device-001/event', qos: 1, retain: false },
            { topic: 'iot/default/sensor/test-device-001/cmd', qos: 1, retain: false },
            { topic: 'iot/default/sensor/test-device-001/shadow/desired', qos: 1, retain: true },
            { topic: 'iot/default/sensor/test-device-001/cfg', qos: 1, retain: true }
          ],
          acl: {
            publish: [
              'iot/default/sensor/test-device-001/telemetry',
              'iot/default/sensor/test-device-001/status',
              'iot/default/sensor/test-device-001/event'
            ],
            subscribe: [
              'iot/default/sensor/test-device-001/cmd',
              'iot/default/sensor/test-device-001/shadow/desired',
              'iot/default/sensor/test-device-001/cfg'
            ]
          }
        })
      })
    };
    
    // 设置策略注册器的mock
    (bootstrapService as any).policyRegistry = mockPolicyRegistry;
    
    // 初始化服务
    await bootstrapService.initialize();

    // 默认 Mock 设置 - 确保所有测试都有基础数据
    mockPrisma.device.findUnique.mockResolvedValue(null);
    mockPrisma.device.findFirst.mockResolvedValue(null);
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 'default',
      name: 'Default Tenant'
    });
    mockCache.get.mockResolvedValue(null);
  });

  describe('processBootstrapRequest', () => {
    const mockRequest: DeviceBootstrapRequest = {
      deviceId: 'test-device-001',
      mac: 'AA:BB:CC:DD:EE:FF',
      deviceType: 'sensor',
      firmware: {
        current: '1.0.0',
        build: '20240101.001',
        minRequired: '1.0.0',
        channel: 'stable'
      },
      hardware: {
        version: 'v1.0',
        serial: 'HW123456'
      },
      capabilities: [{ name: 'temperature' }],
      tenantId: 'default',
      timestamp: 1730899200000
    };

    it('should process valid bootstrap request successfully', async () => {
      // Mock 数据库响应
      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.findFirst.mockResolvedValue(null); // 新设备，不存在
      mockPrisma.device.create.mockResolvedValue({
        id: 'test-device-001',
        tenantId: 'default',
        name: 'sensor-EE:FF',
        type: 'sensor',
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'default',
        name: 'Default Tenant'
      });

      // Mock 缓存响应
      mockCache.get.mockResolvedValue(null);

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'default');

      // 验证响应结构
      expect(result.code).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.mqtt).toBeDefined();
      expect(result.data.ota).toBeDefined();
      expect(result.data.shadowDesired).toBeDefined();
      expect(result.data.policies).toBeDefined();

      // 验证 MQTT 配置
      expect(result.data.mqtt.topics.telemetryPub).toBe('iot/default/sensor/test-device-001/telemetry');
      expect(result.data.mqtt.topics.statusPub).toBe('iot/default/sensor/test-device-001/status');
      expect(result.data.mqtt.topics.cmdSub).toBe('iot/default/sensor/test-device-001/cmd');
      expect(result.data.mqtt.topics.shadowDesiredSub).toBe('iot/default/sensor/test-device-001/shadow/desired');

      // 验证设备创建
      expect(mockPrisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'test-device-001',
          tenantId: 'default',
          name: expect.stringMatching(/^sensor-.*$/), // 放宽命名验证
          type: 'sensor',
          status: 'offline'
        })
      });
    });

    it('should handle existing device update', async () => {
      // Mock 现有设备
      const existingDevice = {
        id: 'test-device-001',
        tenantId: 'default',
        name: 'sensor-EE:FF',
        type: 'sensor',
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // 覆盖默认 mock 设置
      mockPrisma.device.findUnique.mockResolvedValue(existingDevice);
      mockPrisma.device.findFirst.mockResolvedValue(existingDevice); // 现有设备
      mockPrisma.device.update.mockResolvedValue({
        ...existingDevice,
        lastSeen: new Date(),
        updatedAt: new Date()
      });

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'default');

      expect(result.code).toBe(200);
      expect(mockPrisma.device.update).toHaveBeenCalledWith({
        where: { id: 'test-device-001' },
        data: expect.objectContaining({
          lastSeen: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      });
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        ...mockRequest,
        deviceId: '', // 无效的设备ID
        mac: 'invalid-mac' // 无效的MAC地址
      };

      const result = await bootstrapService.processBootstrapRequest(invalidRequest, 'default');

      expect(result.code).toBe(500);
      expect(result.message).toContain('validation failed');
    });

    it('should handle database errors', async () => {
      // 覆盖默认 mock 设置，模拟数据库错误
      mockPrisma.device.findUnique.mockRejectedValue(new Error('Database connection failed'));
      mockPrisma.device.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'default');

      expect(result.code).toBe(500);
      expect(result.message).toContain('Database connection failed');
    });
  });

  describe('MQTT Configuration', () => {
    it('should generate correct MQTT topics structure', async () => {
      const mockRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device-001',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0', channel: 'stable' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId: 'default',
        timestamp: Date.now()
      };

      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.findFirst.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue({
        id: 'test-device-001',
        tenantId: 'default',
        name: 'sensor-EE:FF',
        type: 'sensor',
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'default');

      const mqttConfig = result.data.mqtt;
      
      // 验证主题结构
      expect(mqttConfig.topics.telemetryPub).toBe('iot/default/sensor/test-device-001/telemetry');
      expect(mqttConfig.topics.statusPub).toBe('iot/default/sensor/test-device-001/status');
      expect(mqttConfig.topics.eventPub).toBe('iot/default/sensor/test-device-001/event');
      expect(mqttConfig.topics.cmdSub).toBe('iot/default/sensor/test-device-001/cmd');
      expect(mqttConfig.topics.cmdresPub).toBe('iot/default/sensor/test-device-001/cmdres');
      expect(mqttConfig.topics.shadowDesiredSub).toBe('iot/default/sensor/test-device-001/shadow/desired');
      expect(mqttConfig.topics.shadowReportedPub).toBe('iot/default/sensor/test-device-001/shadow/reported');
      expect(mqttConfig.topics.cfgSub).toBe('iot/default/sensor/test-device-001/cfg');
      expect(mqttConfig.topics.otaProgressPub).toBe('iot/default/sensor/test-device-001/ota/progress');

      // 验证 ACL 权限
      expect(mqttConfig.acl.publish).toContain(mqttConfig.topics.telemetryPub);
      expect(mqttConfig.acl.publish).toContain(mqttConfig.topics.statusPub);
      expect(mqttConfig.acl.subscribe).toContain(mqttConfig.topics.cmdSub);
      expect(mqttConfig.acl.subscribe).toContain(mqttConfig.topics.shadowDesiredSub);

      // 验证 QoS/Retain 策略
      const statusPolicy = mqttConfig.qosRetainPolicy.find(p => p.topic === mqttConfig.topics.statusPub);
      expect(statusPolicy?.qos).toBe(1);
      expect(statusPolicy?.retain).toBe(true);

      const telemetryPolicy = mqttConfig.qosRetainPolicy.find(p => p.topic === mqttConfig.topics.telemetryPub);
      expect(telemetryPolicy?.qos).toBe(1);
      expect(telemetryPolicy?.retain).toBe(false);
    });

    it('should generate unique client ID and credentials', async () => {
      const mockRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device-001',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0', channel: 'stable' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId: 'default',
        timestamp: Date.now()
      };

      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.findFirst.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue({
        id: 'test-device-001',
        tenantId: 'default',
        name: 'sensor-EE:FF',
        type: 'sensor',
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'default');

      const mqttConfig = result.data.mqtt;
      
      // 验证用户名格式
      expect(mqttConfig.username).toBe('default_test-device-001');
      
      // 验证客户端ID包含时间戳
      expect(mqttConfig.clientId).toMatch(/^default_test-device-001_\d+$/);
      
      // 验证密码不为空
      expect(mqttConfig.password).toBeDefined();
      expect(mqttConfig.password.length).toBeGreaterThan(0);
      
      // 验证密码过期时间
      expect(mqttConfig.passwordExpiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('OTA Configuration', () => {
    it('should generate OTA config for beta channel', async () => {
      const mockRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device-001',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { 
          current: '1.0.0', 
          build: '001', 
          minRequired: '1.0.0', 
          channel: 'beta' 
        },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId: 'default',
        timestamp: Date.now()
      };

      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.findFirst.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue({
        id: 'test-device-001',
        tenantId: 'default',
        name: 'sensor-EE:FF',
        type: 'sensor',
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'default');

      const otaConfig = result.data.ota;
      
      // Beta 通道应该有可用的 OTA
      expect(otaConfig.available).toBe(true);
      expect(otaConfig.retry).toBeDefined();
      expect(otaConfig.retry.baseMs).toBe(5000);
      expect(otaConfig.retry.maxMs).toBe(60000);
    });

    it('should not provide OTA for stable channel by default', async () => {
      const mockRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device-001',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { 
          current: '1.0.0', 
          build: '001', 
          minRequired: '1.0.0', 
          channel: 'stable' 
        },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId: 'default',
        timestamp: Date.now()
      };

      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.findFirst.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue({
        id: 'test-device-001',
        tenantId: 'default',
        name: 'sensor-EE:FF',
        type: 'sensor',
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'default');

      const otaConfig = result.data.ota;
      
      // Stable 通道默认不提供 OTA
      expect(otaConfig.available).toBe(false);
    });
  });

  describe('Shadow Desired Configuration', () => {
    it('should generate default shadow desired configuration', async () => {
      const mockRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device-001',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0', channel: 'stable' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId: 'default',
        timestamp: Date.now()
      };

      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.findFirst.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue({
        id: 'test-device-001',
        tenantId: 'default',
        name: 'sensor-EE:FF',
        type: 'sensor',
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'default');

      const shadowDesired = result.data.shadowDesired;
      
      // 验证默认配置
      expect(shadowDesired.reporting).toBeDefined();
      expect(shadowDesired.reporting.heartbeatMs).toBe(60000);
      
      expect(shadowDesired.sensors).toBeDefined();
      expect(shadowDesired.sensors.samplingMs).toBe(30000);
      
      expect(shadowDesired.thresholds).toBeDefined();
      expect(shadowDesired.thresholds.voltage).toBeDefined();
      expect(shadowDesired.thresholds.current).toBeDefined();
      
      expect(shadowDesired.features).toBeDefined();
      expect(shadowDesired.features.alarmEnabled).toBe(true);
      expect(shadowDesired.features.autoRebootDays).toBe(7);
    });
  });

  describe('Policies Configuration', () => {
    it('should generate default policies', async () => {
      const mockRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device-001',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0', channel: 'stable' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId: 'default',
        timestamp: Date.now()
      };

      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.device.findFirst.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue({
        id: 'test-device-001',
        tenantId: 'default',
        name: 'sensor-EE:FF',
        type: 'sensor',
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'default');

      const policies = result.data.policies;
      
      // 验证默认策略
      expect(policies.ingestLimits).toBeDefined();
      expect(policies.ingestLimits.telemetryQps).toBe(10);
      expect(policies.ingestLimits.statusQps).toBe(1);
      
      expect(policies.retention).toBeDefined();
      expect(policies.retention.telemetryDays).toBe(30);
      expect(policies.retention.statusDays).toBe(7);
      expect(policies.retention.eventsDays).toBe(14);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tenant', async () => {
      const mockRequest: DeviceBootstrapRequest = {
        deviceId: 'test-device-001',
        mac: 'AA:BB:CC:DD:EE:FF',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0', channel: 'stable' },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId: 'invalid-tenant',
        timestamp: Date.now()
      };

      mockPrisma.device.findUnique.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const result = await bootstrapService.processBootstrapRequest(mockRequest, 'invalid-tenant');

      expect(result.code).toBe(500);
      expect(result.message).toContain('Invalid tenant ID');
    });

    it('should build error envelope correctly', async () => {
      const error = new Error('Test error');
      const envelope = await bootstrapService.buildErrorEnvelope(
        error,
        'test-device',
        'test-tenant',
        'TEST_ERROR'
      );

      expect(envelope.code).toBe(500);
      expect(envelope.message).toBe('Test error');
      expect(envelope.errorCode).toBe('TEST_ERROR');
      expect(envelope.errorDetails?.['deviceId']).toBe('test-device');
      expect(envelope.errorDetails?.['tenantId']).toBe('test-tenant');
      expect(envelope.errorDetails?.['stack']).toBeDefined();
    });
  });
});
