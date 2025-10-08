// Infrastructure Layer - Redis 缓存 (ioredis)
import Redis, { Redis as RedisType } from 'ioredis';
import { env } from '@/env';

// Redis 客户端单例
let redisClient: RedisType | null = null;

export function getRedisClient(): RedisType {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis Client Ready');
    });

    redisClient.on('close', () => {
      console.log('Redis Client Closed');
    });
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (client.status !== 'ready') {
    await client.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
  }
}

// 缓存工具函数
export class CacheService {
  private client: RedisType;

  constructor() {
    this.client = getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // ioredis 特有功能
  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field);
    return value ? JSON.parse(value) : null;
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.client.hset(key, field, serialized);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  // 支持 Redis Streams
  async xadd(stream: string, fields: Record<string, any>): Promise<string> {
    const serializedFields: string[] = [];
    for (const [key, value] of Object.entries(fields)) {
      serializedFields.push(key, JSON.stringify(value));
    }
    const result = await this.client.xadd(stream, '*', ...serializedFields);
    return result || '';
  }

  async xread(streams: string[], count?: number): Promise<any[]> {
    const args: (string | number)[] = ['COUNT', count || 100, 'BLOCK', 1000, 'STREAMS', ...streams];
    const result = await this.client.xread(args as any);
    return result || [];
  }

  // 测试环境清理方法
  async flushdb(): Promise<void> {
    await this.client.flushdb();
  }

  async flushall(): Promise<void> {
    await this.client.flushall();
  }
}
