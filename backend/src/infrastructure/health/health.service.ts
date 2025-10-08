// Infrastructure Layer - 健康检查服务
import { pgPool } from '@/infrastructure/db/pg';
import { getRedisClient } from '@/infrastructure/cache/redis';

export interface HealthStatus {
  ok: boolean;
  timestamp: string; // UTC ISO string
  localTime: {
    timezone: string;
    iso: string;
    formatted: string;
    epochMs: number;
    utcOffsetMinutes: number;
  };
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

  async getHealthStatus(timezone?: string): Promise<HealthStatus> {
    const [postgres, redis, mqtt] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkMqtt()
    ]);

    const allHealthy = postgres.status === 'healthy' && redis.status === 'healthy' && mqtt.status === 'healthy';

    const utcIso = new Date().toISOString();
    const tz = timezone || 'UTC';
    let isoLocal = utcIso;
    let formattedLocal = utcIso;
    let epochMs = Date.now();
    let utcOffsetMinutes = 0;
    try {
      const dtf = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      });
      const parts = dtf.formatToParts(new Date());
      const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
      isoLocal = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
      formattedLocal = new Intl.DateTimeFormat('zh-CN', { timeZone: tz, dateStyle: 'medium', timeStyle: 'medium' }).format(new Date());
      const now = new Date();
      epochMs = now.getTime();
      // 计算该时区相对UTC的偏移（分钟）
      const localStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(now);
      const utcStr = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(now);
      // 简易偏移估算：仅用于返回展示（不用于计算），确保不会抛错
      const lp = localStr.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2})/);
      const up = utcStr.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2})/);
      if (lp && up) {
        const lH = parseInt((lp[4] ?? '0'), 10), lM = parseInt((lp[5] ?? '0'), 10);
        const uH = parseInt((up[4] ?? '0'), 10), uM = parseInt((up[5] ?? '0'), 10);
        utcOffsetMinutes = (lH * 60 + lM) - (uH * 60 + uM);
        // 归一化到 -720..+840 范围
        if (utcOffsetMinutes > 720) utcOffsetMinutes -= 1440;
        if (utcOffsetMinutes < -720) utcOffsetMinutes += 1440;
      }
    } catch (_e) {
      // fallback keeps utcIso
    }

    return {
      ok: allHealthy,
      timestamp: utcIso,
      localTime: { timezone: tz, iso: isoLocal, formatted: formattedLocal, epochMs, utcOffsetMinutes },
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
