/**
 * 端到端测试框架
 * 
 * 提供完整的端到端测试基础设施，包括：
 * 1. 测试环境设置
 * 2. 数据库初始化
 * 3. MQTT 连接测试
 * 4. HTTP API 测试
 * 5. 多租户场景测试
 */

import { FastifyInstance } from 'fastify';
import { getPrismaClient } from '@/infrastructure/db/prisma';
import { CacheService } from '@/infrastructure/cache/redis';
import { DeviceBootstrapRequest } from '@/modules/bootstrap/types';

// 测试配置
const TEST_CONFIG = {
  database: {
    url: process.env['TEST_DATABASE_URL'] || 'postgresql://iot:iotpw@localhost:5432/iotdb_test',
  },
  redis: {
    url: process.env['TEST_REDIS_URL'] || 'redis://localhost:6379/1',
  },
  mqtt: {
    broker: process.env['TEST_MQTT_BROKER'] || 'mqtt://localhost:1883',
  },
  server: {
    port: process.env['TEST_SERVER_PORT'] || 8001,
  }
};

/**
 * 测试环境管理器
 */
class TestEnvironment {
  private prisma = getPrismaClient();
  private cache = new CacheService();
  private server: FastifyInstance | null = null;

  /**
   * 设置测试环境
   */
  async setup(): Promise<void> {
    // 1. 清理数据库
    await this.cleanDatabase();
    
    // 2. 清理缓存
    await this.cleanCache();
    
    // 3. 运行数据库迁移
    await this.runMigrations();
    
    // 4. 创建测试数据
    await this.createTestData();
  }

  /**
   * 清理测试环境
   */
  async teardown(): Promise<void> {
    if (this.server) {
      await this.server.close();
    }
    
    await this.cleanDatabase();
    await this.cleanCache();
    await this.prisma.$disconnect();
  }

  /**
   * 清理数据库
   */
  private async cleanDatabase(): Promise<void> {
    // 删除所有测试数据
    await this.prisma.deviceBootstrapRecord.deleteMany();
    await this.prisma.device.deleteMany();
    await this.prisma.tenant.deleteMany();
  }

  /**
   * 清理缓存
   */
  private async cleanCache(): Promise<void> {
    // 清理 Redis 测试数据库
    await this.cache.flushdb();
  }

  /**
   * 运行数据库迁移
   */
  private async runMigrations(): Promise<void> {
    // 这里应该运行 Prisma migrate
    // 在实际实现中，可以使用 exec 调用 prisma migrate deploy
  }

  /**
   * 创建测试数据
   */
  private async createTestData(): Promise<void> {
    // 创建测试租户
    await this.prisma.tenant.createMany({
      data: [
        { id: 'test-tenant-1', name: 'Test Tenant 1' },
        { id: 'test-tenant-2', name: 'Test Tenant 2' },
        { id: 'default', name: 'Default Tenant' }
      ]
    });

    // 创建测试设备
    await this.prisma.device.createMany({
      data: [
        {
          id: 'test-device-001',
          tenantId: 'test-tenant-1',
          name: 'Test Sensor 1',
          type: 'sensor',
          status: 'offline',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'test-device-002',
          tenantId: 'test-tenant-2',
          name: 'Test Gateway 1',
          type: 'gateway',
          status: 'offline',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });
  }

  /**
   * 获取 Prisma 客户端
   */
  getPrisma() {
    return this.prisma;
  }

  /**
   * 获取缓存服务
   */
  getCache() {
    return this.cache;
  }
}

/**
 * 测试数据工厂
 */
class TestDataFactory {
  /**
   * 创建有效的引导请求
   */
  static createValidBootstrapRequest(overrides: Partial<DeviceBootstrapRequest> = {}): DeviceBootstrapRequest {
    return {
      deviceId: 'test-device-' + Math.random().toString(36).substr(2, 9),
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
      timestamp: Date.now(),
      ...overrides
    };
  }

  /**
   * 创建无效的引导请求
   */
  static createInvalidBootstrapRequest(): any {
    return {
      deviceId: '',
      mac: 'invalid-mac',
      deviceType: '',
      firmware: {
        current: '',
        build: '',
        minRequired: '',
        channel: 'invalid'
      },
      hardware: {
        version: '',
        serial: ''
      },
      capabilities: 'invalid',
      timestamp: -1
    };
  }

  /**
   * 创建多租户测试数据
   */
  static createMultiTenantTestData() {
    return {
      tenant1: {
        id: 'tenant-1',
        devices: [
          { id: 'device-1-1', type: 'sensor' },
          { id: 'device-1-2', type: 'gateway' }
        ]
      },
      tenant2: {
        id: 'tenant-2',
        devices: [
          { id: 'device-2-1', type: 'sensor' },
          { id: 'device-2-2', type: 'rtu' }
        ]
      }
    };
  }
}

/**
 * API 测试助手
 */
class ApiTestHelper {
  constructor(private server: FastifyInstance) {}

  /**
   * 发送引导请求
   */
  async sendBootstrapRequest(
    request: DeviceBootstrapRequest,
    tenantId: string = 'default'
  ) {
    return this.server.inject({
      method: 'POST',
      url: '/api/config/bootstrap',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId
      },
      payload: request
    });
  }

  /**
   * 发送刷新配置请求
   */
  async sendRefreshConfigRequest(deviceId: string, tenantId: string = 'default') {
    return this.server.inject({
      method: 'PUT',
      url: `/api/config/device/${deviceId}/refresh`,
      headers: {
        'X-Tenant-ID': tenantId
      }
    });
  }

  /**
   * 获取设备配置
   */
  async getDeviceConfig(deviceId: string, tenantId: string = 'default') {
    return this.server.inject({
      method: 'GET',
      url: `/api/config/device/${deviceId}`,
      headers: {
        'X-Tenant-ID': tenantId
      }
    });
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    return this.server.inject({
      method: 'GET',
      url: '/healthz'
    });
  }
}

/**
 * MQTT 测试助手
 */
class MqttTestHelper {
  private client: any = null;

  constructor(private brokerUrl: string = TEST_CONFIG.mqtt.broker) {}

  /**
   * 连接到 MQTT Broker
   */
  async connect(username: string, password: string): Promise<void> {
    const mqtt = await import('mqtt');
    
    this.client = mqtt.connect(this.brokerUrl, {
      username,
      password,
      clientId: `test-client-${Date.now()}`
    });

    return new Promise((resolve, reject) => {
      this.client.on('connect', () => resolve());
      this.client.on('error', reject);
    });
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  /**
   * 发布消息
   */
  async publish(topic: string, message: any, options: any = {}): Promise<void> {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    
    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, options, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 订阅主题
   */
  async subscribe(topic: string, options: any = {}): Promise<any[]> {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }

    const messages: any[] = [];

    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, options, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        const timeout = setTimeout(() => {
          this.client.unsubscribe(topic);
          resolve(messages);
        }, 5000); // 5秒超时

        this.client.on('message', (receivedTopic: string, payload: Buffer) => {
          if (receivedTopic === topic) {
            try {
              const message = JSON.parse(payload.toString());
              messages.push(message);
            } catch {
              messages.push(payload.toString());
            }
          }
        });
      });
    });
  }
}

/**
 * 端到端测试套件
 */
class E2ETestSuite {
  private testEnv: TestEnvironment;
  private apiHelper: ApiTestHelper;
  private mqttHelper: MqttTestHelper;

  constructor(
    private server: FastifyInstance,
    private brokerUrl: string = TEST_CONFIG.mqtt.broker
  ) {
    this.testEnv = new TestEnvironment();
    this.apiHelper = new ApiTestHelper(server);
    this.mqttHelper = new MqttTestHelper(brokerUrl);
  }

  /**
   * 运行完整的端到端测试
   */
  async runFullTestSuite(): Promise<void> {
    try {
      await this.testEnv.setup();

      // 1. 基础功能测试
      await this.testBasicBootstrapFlow();
      
      // 2. 多租户隔离测试
      await this.testMultiTenantIsolation();
      
      // 3. MQTT 集成测试
      await this.testMqttIntegration();
      
      // 4. 错误处理测试
      await this.testErrorHandling();
      
      // 5. 性能测试
      await this.testPerformance();

      console.log('✅ All E2E tests passed');
    } catch (error) {
      console.error('❌ E2E tests failed:', error);
      throw error;
    } finally {
      await this.testEnv.teardown();
    }
  }

  /**
   * 测试基础引导流程
   */
  private async testBasicBootstrapFlow(): Promise<void> {
    console.log('🧪 Testing basic bootstrap flow...');

    const request = TestDataFactory.createValidBootstrapRequest();
    const response = await this.apiHelper.sendBootstrapRequest(request);

    expect(response.statusCode).toBe(200);
    
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.mqtt).toBeDefined();
    expect(body.data.mqtt.topics.telemetryPub).toBe(`iot/default/sensor/${request.deviceId}/telemetry`);
    expect(body.data.ota).toBeDefined();
    expect(body.data.shadowDesired).toBeDefined();
    expect(body.data.policies).toBeDefined();

    console.log('✅ Basic bootstrap flow test passed');
  }

  /**
   * 测试多租户隔离
   */
  private async testMultiTenantIsolation(): Promise<void> {
    console.log('🧪 Testing multi-tenant isolation...');

    const testData = TestDataFactory.createMultiTenantTestData();

    // 测试租户1的设备
    const request1 = TestDataFactory.createValidBootstrapRequest({
      deviceId: 'device-1-1',
      deviceType: 'sensor',
      tenantId: testData.tenant1.id
    });
    
    const response1 = await this.apiHelper.sendBootstrapRequest(request1, testData.tenant1.id);
    expect(response1.statusCode).toBe(200);

    const body1 = JSON.parse(response1.payload);
    expect(body1.data.cfg.tenant).toBe(testData.tenant1.id);
    expect(body1.data.mqtt.topics.telemetryPub).toContain(testData.tenant1.id);

    // 测试租户2的设备
    const request2 = TestDataFactory.createValidBootstrapRequest({
      deviceId: 'device-2-1',
      deviceType: 'sensor',
      tenantId: testData.tenant2.id
    });
    
    const response2 = await this.apiHelper.sendBootstrapRequest(request2, testData.tenant2.id);
    expect(response2.statusCode).toBe(200);

    const body2 = JSON.parse(response2.payload);
    expect(body2.data.cfg.tenant).toBe(testData.tenant2.id);
    expect(body2.data.mqtt.topics.telemetryPub).toContain(testData.tenant2.id);

    // 验证租户隔离
    expect(body1.data.cfg.tenant).not.toBe(body2.data.cfg.tenant);

    console.log('✅ Multi-tenant isolation test passed');
  }

  /**
   * 测试 MQTT 集成
   */
  private async testMqttIntegration(): Promise<void> {
    console.log('🧪 Testing MQTT integration...');

    const request = TestDataFactory.createValidBootstrapRequest();
    const response = await this.apiHelper.sendBootstrapRequest(request);
    
    const body = JSON.parse(response.payload);
    const mqttConfig = body.data.mqtt;

    // 连接到 MQTT
    await this.mqttHelper.connect(mqttConfig.username, mqttConfig.password);

    // 测试发布遥测数据
    const telemetryData = {
      ts: Date.now(),
      msgId: 'test-msg-001',
      deviceId: request.deviceId,
      tenant: 'default',
      ver: '1',
      metrics: {
        temperature: 23.5,
        humidity: 58.2
      },
      mode: 'periodic'
    };

    await this.mqttHelper.publish(
      mqttConfig.topics.telemetryPub,
      telemetryData,
      { qos: 0 }
    );

    // 测试发布状态数据
    const statusData = {
      ts: Date.now(),
      msgId: 'status-msg-001',
      deviceId: request.deviceId,
      tenant: 'default',
      ver: '1',
      online: true,
      battery: 87,
      rssi: -45
    };

    await this.mqttHelper.publish(
      mqttConfig.topics.statusPub,
      statusData,
      { qos: 1, retain: true }
    );

    await this.mqttHelper.disconnect();

    console.log('✅ MQTT integration test passed');
  }

  /**
   * 测试错误处理
   */
  private async testErrorHandling(): Promise<void> {
    console.log('🧪 Testing error handling...');

    // 测试无效请求
    const invalidRequest = TestDataFactory.createInvalidBootstrapRequest();
    const response = await this.apiHelper.sendBootstrapRequest(invalidRequest);

    expect(response.statusCode).toBe(400);
    
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();

    // 测试缺少租户
    const validRequest = TestDataFactory.createValidBootstrapRequest();
    const responseNoTenant = await this.apiHelper.sendBootstrapRequest(validRequest, '');

    expect(responseNoTenant.statusCode).toBe(400);

    console.log('✅ Error handling test passed');
  }

  /**
   * 测试性能
   */
  private async testPerformance(): Promise<void> {
    console.log('🧪 Testing performance...');

    const startTime = Date.now();
    const concurrentRequests = 10;
    const promises: Promise<any>[] = [];

    // 并发发送多个请求
    for (let i = 0; i < concurrentRequests; i++) {
      const request = TestDataFactory.createValidBootstrapRequest({
        deviceId: `perf-test-device-${i}`
      });
      promises.push(this.apiHelper.sendBootstrapRequest(request));
    }

    const responses = await Promise.all(promises);
    const endTime = Date.now();

    // 验证所有请求都成功
    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
    });

    const totalTime = endTime - startTime;
    const avgTime = totalTime / concurrentRequests;

    console.log(`📊 Performance: ${concurrentRequests} requests in ${totalTime}ms (avg: ${avgTime.toFixed(2)}ms)`);
    
    // 性能断言（可以根据需要调整）
    expect(avgTime).toBeLessThan(1000); // 平均响应时间小于1秒

    console.log('✅ Performance test passed');
  }
}

// 导出测试工具
export {
  TestEnvironment,
  TestDataFactory,
  ApiTestHelper,
  MqttTestHelper,
  E2ETestSuite,
  TEST_CONFIG
};
