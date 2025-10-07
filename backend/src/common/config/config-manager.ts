import fs from 'fs';
import path from 'path';

export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
  };
  mqtt: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  logging: {
    level: string;
    file: string;
  };
}

class ConfigManager {
  private config: AppConfig;
  private configPath: string;
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.configPath = this.getConfigPath();
    this.config = this.loadConfig();
  }

  private getConfigPath(): string {
    const configDir = path.join(process.cwd(), '..', 'docker', 'config');
    const configFile = `app.${this.environment}.json`;
    return path.join(configDir, configFile);
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        console.log(`加载配置文件: ${this.configPath}`);
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // 合并环境变量覆盖
        this.applyEnvironmentOverrides(config);
        
        return config;
      } else {
        console.warn(`配置文件不存在: ${this.configPath}，使用默认配置`);
        return this.getDefaultConfig();
      }
    } catch (error) {
      console.error('加载配置文件失败:', error);
      return this.getDefaultConfig();
    }
  }

  private applyEnvironmentOverrides(config: AppConfig): void {
    // 服务器配置
    if (process.env.PORT) {
      config.server.port = parseInt(process.env.PORT);
    }
    if (process.env.HOST) {
      config.server.host = process.env.HOST;
    }

    // CORS配置
    if (process.env.CORS_ORIGIN) {
      config.cors.origin = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
    }

    // 数据库配置
    if (process.env.DB_HOST) config.database.host = process.env.DB_HOST;
    if (process.env.DB_PORT) config.database.port = parseInt(process.env.DB_PORT);
    if (process.env.DB_NAME) config.database.database = process.env.DB_NAME;
    if (process.env.DB_USER) config.database.username = process.env.DB_USER;
    if (process.env.DB_PASSWORD) config.database.password = process.env.DB_PASSWORD;

    // Redis配置
    if (process.env.REDIS_HOST) config.redis.host = process.env.REDIS_HOST;
    if (process.env.REDIS_PORT) config.redis.port = parseInt(process.env.REDIS_PORT);
    if (process.env.REDIS_PASSWORD) config.redis.password = process.env.REDIS_PASSWORD;

    // MQTT配置
    if (process.env.MQTT_HOST) config.mqtt.host = process.env.MQTT_HOST;
    if (process.env.MQTT_PORT) config.mqtt.port = parseInt(process.env.MQTT_PORT);
    if (process.env.MQTT_USERNAME) config.mqtt.username = process.env.MQTT_USERNAME;
    if (process.env.MQTT_PASSWORD) config.mqtt.password = process.env.MQTT_PASSWORD;

    // JWT配置
    if (process.env.JWT_SECRET) config.jwt.secret = process.env.JWT_SECRET;
    if (process.env.JWT_EXPIRES_IN) config.jwt.expiresIn = process.env.JWT_EXPIRES_IN;

    // 日志配置
    if (process.env.LOG_LEVEL) config.logging.level = process.env.LOG_LEVEL;
    if (process.env.LOG_FILE) config.logging.file = process.env.LOG_FILE;
  }

  private getDefaultConfig(): AppConfig {
    return {
      server: {
        port: 8000,
        host: '0.0.0.0'
      },
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      },
      database: {
        host: 'postgres',
        port: 5432,
        database: 'iot_platform',
        username: 'iot_user',
        password: 'iot_password'
      },
      redis: {
        host: 'redis',
        port: 6379,
        password: ''
      },
      mqtt: {
        host: 'emqx',
        port: 1883,
        username: '',
        password: ''
      },
      jwt: {
        secret: 'your-secret-key-here',
        expiresIn: '24h'
      },
      logging: {
        level: 'info',
        file: 'logs/app.log'
      }
    };
  }

  public getConfig(): AppConfig {
    return this.config;
  }

  public reloadConfig(): void {
    this.config = this.loadConfig();
  }

  public getServerConfig() {
    return this.config.server;
  }

  public getCorsConfig() {
    return this.config.cors;
  }

  public getDatabaseConfig() {
    return this.config.database;
  }

  public getRedisConfig() {
    return this.config.redis;
  }

  public getMqttConfig() {
    return this.config.mqtt;
  }

  public getJwtConfig() {
    return this.config.jwt;
  }

  public getLoggingConfig() {
    return this.config.logging;
  }
}

// 单例模式
export const configManager = new ConfigManager();
export default configManager;
