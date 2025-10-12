import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8001'),
  host: process.env.HOST || '0.0.0.0',

  // Database
  postgres: {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'iot_platform',
    user: process.env.POSTGRES_USER || 'iot_user',
    password: process.env.POSTGRES_PASSWORD || 'iot_password_2025',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'redis_password_2025',
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
} as const;

// 验证必需的环境变量
export const validateConfig = (): void => {
  const required = ['POSTGRES_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && config.nodeEnv === 'production') {
    console.warn(`Warning: Missing required environment variables: ${missing.join(', ')}`);
  }
};


