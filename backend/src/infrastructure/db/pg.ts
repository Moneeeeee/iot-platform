// Infrastructure Layer - PostgreSQL 原生连接（时序数据）
import { Pool, PoolClient } from 'pg';
import { env } from '@/env';

// 连接池配置
const poolConfig = {
  connectionString: env.DATABASE_URL,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// 创建连接池
export const pgPool = new Pool(poolConfig);

// 添加错误监听
pgPool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

pgPool.on('connect', () => {
  console.log('PostgreSQL client connected');
});

pgPool.on('remove', () => {
  console.log('PostgreSQL client removed from pool');
});

// 获取连接
export async function getPgClient(): Promise<PoolClient> {
  return await pgPool.connect();
}

// 执行查询
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await getPgClient();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// 执行事务
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPgClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 关闭连接池
export async function closePgPool(): Promise<void> {
  await pgPool.end();
}
