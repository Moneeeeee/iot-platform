/**
 * MQTT Core Service
 * 职责：只负责连接管理、发布订阅、事件分发，不含业务逻辑
 */

import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import { logger } from '@/common/logger';
import { MQTTConfig, MQTTMessage, MQTTPublishOptions, MQTTSubscribeOptions, MQTTConnectionInfo } from './types';

export class MQTTCoreService extends EventEmitter {
  private client: MqttClient | null = null;
  private config: MQTTConfig;
  private connectionInfo: MQTTConnectionInfo;

  constructor(config: MQTTConfig) {
    super();
    this.config = config;
    this.connectionInfo = {
      connected: false,
      clientId: config.clientId,
      brokerUrl: config.brokerUrl,
      reconnectAttempts: 0
    };
  }

  /**
   * 初始化MQTT连接
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.warn('MQTT is disabled, skipping initialization');
      return;
    }

    try {
      const options: mqtt.IClientOptions = {
        clientId: this.config.clientId,
        clean: this.config.clean,
        connectTimeout: this.config.connectTimeout || 30000, // 增加连接超时时间
        reconnectPeriod: this.config.reconnectPeriod || 5000, // 重连间隔
        username: this.config.username,
        password: this.config.password,
        will: this.config.will,
        // 添加更强的重连配置
        keepalive: 60,
        reschedulePings: true,
        queueQoSZero: false
      };

      this.client = mqtt.connect(this.config.brokerUrl, options);
      this.setupEventHandlers();

      logger.info('MQTT Core Service initialized', {
        brokerUrl: this.config.brokerUrl,
        clientId: this.config.clientId
      });
    } catch (error) {
      logger.error('Failed to initialize MQTT Core Service', error);
      throw error;
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.connectionInfo.connected = true;
      this.connectionInfo.lastConnected = new Date();
      this.connectionInfo.reconnectAttempts = 0;

      logger.info('MQTT Core Service connected');
      this.emit('connected', this.connectionInfo);
    });

    this.client.on('disconnect', () => {
      this.connectionInfo.connected = false;
      logger.warn('MQTT Core Service disconnected');
      this.emit('disconnected');
    });

    this.client.on('reconnect', () => {
      this.connectionInfo.reconnectAttempts++;
      logger.info(`MQTT Core Service reconnecting... (${this.connectionInfo.reconnectAttempts})`);
      this.emit('reconnecting', this.connectionInfo.reconnectAttempts);
    });

    this.client.on('error', (error) => {
      logger.error('MQTT Core Service error', { 
        error: error.message,
        brokerUrl: this.config.brokerUrl,
        clientId: this.config.clientId,
        reconnectAttempts: this.connectionInfo.reconnectAttempts
      });
      this.emit('error', error);
    });

    this.client.on('message', (topic, payload, packet) => {
      const message: MQTTMessage = {
        topic,
        payload,
        qos: packet.qos,
        retain: packet.retain,
        timestamp: new Date()
      };

      // 分发消息事件，不处理业务逻辑
      this.emit('message', message);
    });
  }

  /**
   * 发布消息
   */
  async publish(topic: string, payload: any, options: MQTTPublishOptions = {}): Promise<boolean> {
    if (!this.client || !this.connectionInfo.connected) {
      logger.warn('MQTT client not connected, cannot publish message');
      return false;
    }

    try {
      const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      this.client.publish(topic, message, {
        qos: options.qos || 1,
        retain: options.retain || false,
        dup: options.dup || false
      });

      logger.debug('Published MQTT message', { topic, qos: options.qos });
      return true;
    } catch (error) {
      logger.error('Failed to publish MQTT message', { topic, error });
      return false;
    }
  }

  /**
   * 订阅主题
   */
  async subscribe(topic: string, options: MQTTSubscribeOptions = {}): Promise<boolean> {
    if (!this.client || !this.connectionInfo.connected) {
      logger.warn('MQTT client not connected, cannot subscribe');
      return false;
    }

    try {
      return new Promise((resolve, reject) => {
        this.client!.subscribe(topic, { qos: options.qos || 1 }, (error) => {
          if (error) {
            logger.error(`Failed to subscribe to ${topic}`, { error: error.message });
            reject(error);
          } else {
            logger.debug(`Subscribed to topic: ${topic}`);
            resolve(true);
          }
        });
      });
    } catch (error) {
      logger.error('Failed to subscribe to topic', { topic, error });
      return false;
    }
  }

  /**
   * 取消订阅主题
   */
  async unsubscribe(topic: string): Promise<boolean> {
    if (!this.client || !this.connectionInfo.connected) {
      logger.warn('MQTT client not connected, cannot unsubscribe');
      return false;
    }

    try {
      return new Promise((resolve, reject) => {
        this.client!.unsubscribe(topic, (error) => {
          if (error) {
            logger.error(`Failed to unsubscribe from ${topic}`, { error: error.message });
            reject(error);
          } else {
            logger.debug(`Unsubscribed from topic: ${topic}`);
            resolve(true);
          }
        });
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from topic', { topic, error });
      return false;
    }
  }

  /**
   * 批量订阅主题
   */
  async subscribeMultiple(topics: string[], options: MQTTSubscribeOptions = {}): Promise<boolean> {
    if (!this.client || !this.connectionInfo.connected) {
      logger.warn('MQTT client not connected, cannot subscribe');
      return false;
    }

    try {
      return new Promise((resolve, reject) => {
        this.client!.subscribe(topics, { qos: options.qos || 1 }, (error) => {
          if (error) {
            logger.error('Failed to subscribe to multiple topics', { topics, error: error.message });
            reject(error);
          } else {
            logger.debug(`Subscribed to ${topics.length} topics`);
            resolve(true);
          }
        });
      });
    } catch (error) {
      logger.error('Failed to subscribe to multiple topics', { topics, error });
      return false;
    }
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): MQTTConnectionInfo {
    return { ...this.connectionInfo };
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connectionInfo.connected && this.client?.connected === true;
  }

  /**
   * 关闭MQTT连接
   */
  async shutdown(): Promise<void> {
    try {
      if (this.client) {
        // 发布离线状态
        if (this.connectionInfo.connected) {
          await this.publish('system/gateway/status', {
            status: 'offline',
            timestamp: new Date()
          });
        }

        // 关闭连接
        this.client.end();
        this.client = null;
        this.connectionInfo.connected = false;
      }

      logger.info('MQTT Core Service shutdown');
    } catch (error) {
      logger.error('Failed to shutdown MQTT Core Service', error);
    }
  }
}
