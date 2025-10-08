/**
 * Bootstrap Controller 单元测试
 * 
 * 测试内容：
 * 1. 正常引导流程
 * 2. 缓存命中
 * 3. 错误处理
 * 4. 响应格式
 * 5. 幂等性检查
 */

import { BootstrapController } from '@/modules/bootstrap/bootstrap.controller';
import { BootstrapService } from '@/modules/bootstrap/bootstrap.service';
import { CacheService } from '@/infrastructure/cache/redis';
import { TestDataFactory } from '@/__tests__/test-data-factory';

// Mock 依赖
jest.mock('@/modules/bootstrap/bootstrap.service');
jest.mock('@/infrastructure/cache/redis');

describe('BootstrapController', () => {
  let controller: BootstrapController;
  let mockBootstrapService: jest.Mocked<BootstrapService>;
  let mockCache: jest.Mocked<CacheService>;

  beforeEach(() => {
    // 创建 mock 实例
    mockBootstrapService = {
      processBootstrapRequest: jest.fn(),
      buildErrorEnvelope: jest.fn().mockResolvedValue(TestDataFactory.createErrorResponse(500, 'Mock Error', 'MOCK_ERROR')),
    } as any;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
    } as any;

    // 创建控制器实例（无参数构造函数）
    controller = new BootstrapController();
    
    // 替换内部服务实例
    (controller as any).bootstrapService = mockBootstrapService;
    (controller as any).cache = mockCache;
  });

  describe('handleBootstrap', () => {
    it('应该成功处理引导请求', async () => {
      const mockRequest = {
        body: {
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
            serial: 'TEST-001'
          },
          capabilities: [{ name: 'temperature_sensor' }],
          tenantId: 'default',
          timestamp: Date.now(),
          messageId: 'test-message-123'
        },
        headers: {
          'x-message-id': 'test-message-123'
        },
        query: {},
        tenant: { id: 'default' },
        log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
      } as any;

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as any;

      const mockEnvelope = TestDataFactory.createBootstrapResponseEnvelope();

      mockBootstrapService.processBootstrapRequest.mockResolvedValue(mockEnvelope);
      mockCache.get.mockResolvedValue(null); // 无缓存

      await controller.handleBootstrap(mockRequest, mockReply);

      // 验证服务调用
      expect(mockBootstrapService.processBootstrapRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'test-device-001',
          mac: 'AA:BB:CC:DD:EE:FF',
          deviceType: 'sensor'
        }),
        'default'
      );

      // 验证响应
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: mockEnvelope,
        message: 'Success',
        timestamp: expect.any(String)
      });
    });

    it('应该处理服务错误', async () => {
      const mockRequest = {
        body: {
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
            serial: 'TEST-001'
          },
          capabilities: [{ name: 'temperature_sensor' }],
          tenantId: 'default',
          timestamp: Date.now(),
          messageId: 'test-message-456'
        },
        headers: {
          'x-message-id': 'test-message-456'
        },
        query: {},
        tenant: { id: 'default' },
        log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
      } as any;

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as any;

      const mockErrorEnvelope = TestDataFactory.createErrorResponse(500, 'Internal Server Error', 'INTERNAL_ERROR');

      mockBootstrapService.processBootstrapRequest.mockRejectedValue(new Error('Database connection failed'));
      mockBootstrapService.buildErrorEnvelope.mockResolvedValue(mockErrorEnvelope);
      mockCache.get.mockResolvedValue(null);

      await controller.handleBootstrap(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        timestamp: expect.any(String)
      });
    });

    it('应该处理验证错误', async () => {
      const mockRequest = {
        body: {
          // 缺少必需字段
        },
        headers: {},
        query: {},
        tenant: { id: 'default' },
        log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
      } as any;

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as any;

      const mockErrorEnvelope = TestDataFactory.createErrorResponse(400, 'Validation Error', 'VALIDATION_ERROR');

      mockBootstrapService.buildErrorEnvelope.mockResolvedValue(mockErrorEnvelope);

      await controller.handleBootstrap(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        timestamp: expect.any(String)
      });
    });

    it('应该处理缓存命中', async () => {
      const mockRequest = {
        body: {
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
            serial: 'TEST-001'
          },
          capabilities: [{ name: 'temperature_sensor' }],
          tenantId: 'default',
          timestamp: Date.now(),
          messageId: 'test-message-123'
        },
        headers: {
          'x-message-id': 'test-message-123'
        },
        query: {},
        tenant: { id: 'default' },
        log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
      } as any;

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as any;

      const cachedEnvelope = TestDataFactory.createBootstrapResponseEnvelope({
        code: 200,
        data: {
          ...TestDataFactory.createDeviceBootstrapResponse(),
          cfg: {
            ...TestDataFactory.createBootstrapConfig(),
            expiresAt: Date.now() + 3600000 // 1小时后过期
          }
        }
      });

      mockCache.get.mockResolvedValue(cachedEnvelope);

      await controller.handleBootstrap(mockRequest, mockReply);

      // 验证缓存命中
      expect(mockCache.get).toHaveBeenCalledWith('idempotency:default:test-device-001:test-message-123');
      expect(mockBootstrapService.processBootstrapRequest).not.toHaveBeenCalled();

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: cachedEnvelope,
        message: 'Success',
        timestamp: expect.any(String)
      });
    });

    it('应该处理租户解析', async () => {
      const mockRequest = {
        body: {
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
            serial: 'TEST-001'
          },
          capabilities: [{ name: 'temperature_sensor' }],
          tenantId: 'custom-tenant',
          timestamp: Date.now(),
          messageId: 'test-message-789'
        },
        headers: {
          'x-tenant-id': 'custom-tenant',
          'x-message-id': 'test-message-789'
        },
        query: {},
        tenant: { id: 'custom-tenant' },
        log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
      } as any;

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as any;

      const mockEnvelope = TestDataFactory.createBootstrapResponseEnvelope();

      mockBootstrapService.processBootstrapRequest.mockResolvedValue(mockEnvelope);
      mockCache.get.mockResolvedValue(null);

      await controller.handleBootstrap(mockRequest, mockReply);

      expect(mockBootstrapService.processBootstrapRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'test-device-001',
          tenantId: 'custom-tenant'
        }),
        'custom-tenant'
      );
    });

    it('应该处理幂等性检查', async () => {
      const mockRequest = {
        body: {
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
            serial: 'TEST-001'
          },
          capabilities: [{ name: 'temperature_sensor' }],
          tenantId: 'default',
          timestamp: Date.now(),
          messageId: 'test-key-123'
        },
        headers: {
          'x-message-id': 'test-key-123'
        },
        query: {},
        tenant: { id: 'default' },
        log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
      } as any;

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as any;

      const mockEnvelope = TestDataFactory.createBootstrapResponseEnvelope();

      mockBootstrapService.processBootstrapRequest.mockResolvedValue(mockEnvelope);
      mockCache.get.mockResolvedValue(null);

      await controller.handleBootstrap(mockRequest, mockReply);

      // 验证幂等性检查
      expect(mockCache.get).toHaveBeenCalledWith('idempotency:default:test-device-001:test-key-123');
    });
  });

  describe('handleRefreshConfig', () => {
    it('应该成功处理刷新请求', async () => {
      const mockRequest = {
        params: { deviceId: 'test-device-001' },
        headers: {},
        query: {},
        tenant: { id: 'default' },
        log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
      } as any;

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as any;

      const mockEnvelope = TestDataFactory.createBootstrapResponseEnvelope();

      mockBootstrapService.processBootstrapRequest.mockResolvedValue(mockEnvelope);

      await controller.handleRefreshConfig(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: mockEnvelope,
        message: 'Success',
        timestamp: expect.any(String)
      });
    });
  });

  describe('handleGetDeviceConfig', () => {
    it('应该成功处理配置查询', async () => {
      const mockRequest = {
        params: { deviceId: 'test-device-001' },
        headers: {},
        query: {},
        tenant: { id: 'default' },
        log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
      } as any;

      const mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as any;

      const mockConfig = {
        deviceId: 'test-device-001',
        tenantId: 'default',
        lastBootstrap: new Date().toISOString(),
        status: 'active'
      };

      mockCache.get.mockResolvedValue(mockConfig);

      await controller.handleGetDeviceConfig(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: mockConfig,
        message: 'Success',
        timestamp: expect.any(String)
      });
    });
  });
});