/**
 * 健康检查服务
 * 提供各种服务的健康状态检查
 */

import { createClient } from 'redis';
import mqtt from 'mqtt';
import { logger } from '@/utils/logger';

export interface HealthStatus {
  service: string;
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

export class HealthService {
  private redisClient: any;
  private mqttClient: any;
  private mqttConnected: boolean = false;

  constructor() {
    this.initializeRedis();
    this.initializeMQTT();
  }

  /**
   * 初始化Redis客户端
   */
  private initializeRedis(): void {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://redis:6379',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
        },
      });

      this.redisClient.on('error', (err: any) => {
        logger.error('Redis client error:', err);
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis client connected');
      });
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
    }
  }

  /**
   * 初始化MQTT客户端
   */
  private initializeMQTT(): void {
    try {
      const mqttUrl = process.env.MQTT_BROKER_URL || 'mqtt://mosquitto:1883';
      
      this.mqttClient = mqtt.connect(mqttUrl, {
        clientId: 'health-check-client',
        connectTimeout: 5000,
        reconnectPeriod: 0, // 禁用自动重连
      });

      this.mqttClient.on('connect', () => {
        this.mqttConnected = true;
        logger.info('MQTT client connected for health check');
        this.mqttClient.end(); // 立即断开连接
      });

      this.mqttClient.on('error', (err: any) => {
        this.mqttConnected = false;
        logger.error('MQTT client error:', err);
      });

      this.mqttClient.on('close', () => {
        this.mqttConnected = false;
      });
    } catch (error) {
      logger.error('Failed to initialize MQTT client:', error);
    }
  }

  /**
   * 检查Redis健康状态
   */
  public async checkRedis(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.redisClient) {
        return {
          service: 'redis',
          status: 'down',
          error: 'Redis client not initialized',
          timestamp: new Date(),
        };
      }

      // 尝试连接Redis
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
      }

      // 执行ping命令
      const result = await this.redisClient.ping();
      
      if (result === 'PONG') {
        return {
          service: 'redis',
          status: 'up',
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      } else {
        return {
          service: 'redis',
          status: 'down',
          error: 'Unexpected ping response',
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        service: 'redis',
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 检查MQTT健康状态
   */
  public async checkMQTT(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // 创建一个新的MQTT客户端进行健康检查
      const mqttUrl = process.env.MQTT_BROKER_URL || 'mqtt://emqx:1883';
      
      return new Promise((resolve) => {
        const testClient = mqtt.connect(mqttUrl, {
          clientId: `health-check-${Date.now()}`,
          connectTimeout: 3000,
          reconnectPeriod: 0,
        });

        const timeout = setTimeout(() => {
          testClient.end();
          resolve({
            service: 'mqtt',
            status: 'down',
            error: 'Connection timeout',
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          });
        }, 3000);

        testClient.on('connect', () => {
          clearTimeout(timeout);
          testClient.end();
          resolve({
            service: 'mqtt',
            status: 'up',
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          });
        });

        testClient.on('error', (error) => {
          clearTimeout(timeout);
          testClient.end();
          resolve({
            service: 'mqtt',
            status: 'down',
            error: error.message,
            responseTime: Date.now() - startTime,
            timestamp: new Date(),
          });
        });
      });
    } catch (error) {
      return {
        service: 'mqtt',
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 执行所有健康检查
   */
  public async checkAll(): Promise<{
    overall: 'healthy' | 'unhealthy';
    services: Record<string, HealthStatus>;
    timestamp: Date;
  }> {
    const [redis, mqtt] = await Promise.all([
      this.checkRedis(),
      this.checkMQTT(),
    ]);

    const services = {
      redis,
      mqtt,
    };

    const overall = Object.values(services).every(service => service.status === 'up') 
      ? 'healthy' 
      : 'unhealthy';

    return {
      overall,
      services,
      timestamp: new Date(),
    };
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.quit();
      }
      
      if (this.mqttClient && this.mqttClient.connected) {
        this.mqttClient.end();
      }
    } catch (error) {
      logger.error('Error during health service cleanup:', error);
    }
  }
}

// 导出单例实例
export const healthService = new HealthService();
