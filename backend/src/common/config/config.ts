/**
 * 配置管理模块
 * 支持JSON配置文件和环境变量
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 配置接口定义
export interface Config {
  server: {
    port: number;
    host: string;
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
    };
  };
  redis: {
    url: string;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
  };
  mqtt: {
    broker: string;
    options: {
      clientId: string;
      keepalive: number;
      reconnectPeriod: number;
      connectTimeout: number;
    };
  };
  jwt: {
    secret: string;
    expiresIn: string;
    algorithm: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  logging: {
    level: string;
    format: string;
    file: {
      enabled: boolean;
      filename: string;
      maxSize: string;
      maxFiles: number;
    };
    error: {
      enabled: boolean;
      filename: string;
      maxSize: string;
      maxFiles: number;
    };
  };
  security: {
    bcryptRounds: number;
    sessionSecret: string;
  };
  features: {
    registration: boolean;
    emailVerification: boolean;
    passwordReset: boolean;
    twoFactorAuth: boolean;
  };
  alerts: {
    enabled: boolean;
    checkInterval: number;
    retentionDays: number;
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}

/**
 * 配置管理器类
 */
class ConfigManager {
  private config: Config | null = null;
  private configPath: string;

  constructor() {
    // 从环境变量获取配置文件路径，默认为config.json
    this.configPath = process.env.CONFIG_FILE || '/app/config/config.json';
  }

  /**
   * 加载配置
   */
  public loadConfig(): Config {
    if (this.config) {
      return this.config;
    }

    try {
      // 尝试从JSON文件加载配置
      if (fs.existsSync(this.configPath)) {
        console.log(`Loading configuration from: ${this.configPath}`);
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
        console.log('Configuration loaded from JSON file');
        
        // 设置环境变量以便Prisma使用
        this.setEnvironmentVariables();
      } else {
        console.log(`Config file not found: ${this.configPath}, using environment variables`);
        this.config = this.loadFromEnvironment();
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      console.log('Falling back to environment variables');
      this.config = this.loadFromEnvironment();
    }

    return this.config!;
  }

  /**
   * 设置环境变量以便Prisma等工具使用
   */
  private setEnvironmentVariables(): void {
    if (!this.config) return;
    
    // 设置数据库URL
    if (this.config.database?.url) {
      process.env.DATABASE_URL = this.config.database.url;
    }
    
    // 设置Redis URL
    if (this.config.redis?.url) {
      process.env.REDIS_URL = this.config.redis.url;
    }
    
    // 设置MQTT URL
    if (this.config.mqtt?.broker) {
      process.env.MQTT_BROKER_URL = this.config.mqtt.broker;
    }
    
    // 设置JWT密钥
    if (this.config.jwt?.secret) {
      process.env.JWT_SECRET = this.config.jwt.secret;
    }
    
    // 设置速率限制配置
    if (this.config.rateLimit?.windowMs) {
      process.env.RATE_LIMIT_WINDOW_MS = this.config.rateLimit.windowMs.toString();
    }
    if (this.config.rateLimit?.maxRequests) {
      process.env.RATE_LIMIT_MAX_REQUESTS = this.config.rateLimit.maxRequests.toString();
    }
    
    // 设置日志级别
    if (this.config.logging?.level) {
      process.env.LOG_LEVEL = this.config.logging.level;
    }
  }

  /**
   * 从环境变量加载配置
   */
  private loadFromEnvironment(): Config {
    return {
      server: {
        port: parseInt(process.env.PORT || '8000'),
        host: process.env.HOST || '0.0.0.0',
        cors: {
          origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
          credentials: true,
        },
      },
      database: {
        url: process.env.DATABASE_URL || 'postgresql://iot_user:iot_password@localhost:5432/iot_platform',
        pool: {
          min: parseInt(process.env.DB_POOL_MIN || '2'),
          max: parseInt(process.env.DB_POOL_MAX || '10'),
        },
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
        maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      },
      mqtt: {
        broker: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
        options: {
          clientId: process.env.MQTT_CLIENT_ID || 'iot-platform-gateway',
          keepalive: parseInt(process.env.MQTT_KEEPALIVE || '60'),
          reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD || '5000'),
          connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT || '30000'),
        },
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'iot-platform-super-secret-jwt-key-2024',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        algorithm: process.env.JWT_ALGORITHM || 'HS256',
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        file: {
          enabled: process.env.LOG_FILE_ENABLED !== 'false',
          filename: process.env.LOG_FILE || 'logs/combined.log',
          maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
          maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '5'),
        },
        error: {
          enabled: process.env.LOG_ERROR_ENABLED !== 'false',
          filename: process.env.LOG_ERROR_FILE || 'logs/error.log',
          maxSize: process.env.LOG_ERROR_MAX_SIZE || '10m',
          maxFiles: parseInt(process.env.LOG_ERROR_MAX_FILES || '5'),
        },
      },
      security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        sessionSecret: process.env.SESSION_SECRET || 'iot-platform-session-secret-2024',
      },
      features: {
        registration: process.env.FEATURE_REGISTRATION !== 'false',
        emailVerification: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
        passwordReset: process.env.FEATURE_PASSWORD_RESET !== 'false',
        twoFactorAuth: process.env.FEATURE_TWO_FACTOR_AUTH === 'true',
      },
      alerts: {
        enabled: process.env.ALERTS_ENABLED !== 'false',
        checkInterval: parseInt(process.env.ALERTS_CHECK_INTERVAL || '30000'),
        retentionDays: parseInt(process.env.ALERTS_RETENTION_DAYS || '30'),
      },
      healthCheck: {
        enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
        interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
        timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
      },
    };
  }

  /**
   * 获取配置
   */
  public getConfig(): Config {
    return this.loadConfig();
  }

  /**
   * 获取特定配置项
   */
  public get<T = any>(key: string): T {
    const config = this.getConfig();
    const keys = key.split('.');
    let value: any = config;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        return undefined as T;
      }
    }
    
    return value as T;
  }
}

// 导出配置管理器实例
export const configManager = new ConfigManager();
export const config = configManager.getConfig();
