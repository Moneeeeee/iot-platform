// 健康检查测试
import { HealthService } from '@/infrastructure/health/health.service';

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    healthService = new HealthService();
  });

  test('should return health status', async () => {
    const health = await healthService.getHealthStatus();
    
    expect(health).toHaveProperty('ok');
    expect(health).toHaveProperty('timestamp');
    expect(health).toHaveProperty('service', 'backend');
    expect(health).toHaveProperty('version', '2.0.0');
    expect(health).toHaveProperty('deps');
    expect(health.deps).toHaveProperty('postgres');
    expect(health.deps).toHaveProperty('redis');
    expect(health.deps).toHaveProperty('mqtt');
  });

  test('should check postgres connection', async () => {
    const isHealthy = await healthService.checkPostgres();
    expect(typeof isHealthy).toBe('boolean');
  });

  test('should check redis connection', async () => {
    const isHealthy = await healthService.checkRedis();
    expect(typeof isHealthy).toBe('boolean');
  });
});
