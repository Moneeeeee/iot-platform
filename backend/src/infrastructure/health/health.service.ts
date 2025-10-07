// Infrastructure Layer - 健康检查服务
import { pgPool } from '@/infrastructure/db/pg';
import { getRedisClient } from '@/infrastructure/cache/redis';

export interface HealthStatus {
  ok: boolean;
  timestamp: string;
  service: string;
  version: string;
  deps: {
    postgres: {
      status: 'healthy' | 'unhealthy';
      connected: boolean;
      responseTime?: number;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      connected: boolean;
      responseTime?: number;
    };
    mqtt: {
      status: 'healthy' | 'unhealthy';
      connected: boolean;
      responseTime?: number;
    };
  };
}

export class HealthService {
  async checkPostgres(): Promise<{ status: 'healthy' | 'unhealthy'; connected: boolean; responseTime?: number }> {
    const startTime = Date.now();
    try {
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      const responseTime = Date.now() - startTime;
      return {
        status: 'healthy',
        connected: true,
        responseTime
      };
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  async checkRedis(): Promise<{ status: 'healthy' | 'unhealthy'; connected: boolean; responseTime?: number }> {
    const startTime = Date.now();
    try {
      const client = getRedisClient();
      await client.ping();
      const responseTime = Date.now() - startTime;
      return {
        status: 'healthy',
        connected: true,
        responseTime
      };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  async checkMqtt(): Promise<{ status: 'healthy' | 'unhealthy'; connected: boolean; responseTime?: number }> {
    const startTime = Date.now();
    try {
      // MQTT 检查逻辑可以在这里实现
      // 暂时返回健康状态，后续可以添加实际的 MQTT 连接检查
      const responseTime = Date.now() - startTime;
      return {
        status: 'healthy',
        connected: true,
        responseTime
      };
    } catch (error) {
      console.error('MQTT health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const [postgres, redis, mqtt] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkMqtt()
    ]);

    const allHealthy = postgres.status === 'healthy' && redis.status === 'healthy' && mqtt.status === 'healthy';

    return {
      ok: allHealthy,
      timestamp: new Date().toISOString(),
      service: 'backend',
      version: '2.0.0',
      deps: {
        postgres,
        redis,
        mqtt
      }
    };
  }
}
