import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export const createDbPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'iot_platform',
      user: process.env.POSTGRES_USER || 'iot_user',
      password: process.env.POSTGRES_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  return pool;
};

export const getDbPool = (): Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call createDbPool() first.');
  }
  return pool;
};

export const closeDbPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

// 测试数据库连接
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client: PoolClient = await getDbPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};


