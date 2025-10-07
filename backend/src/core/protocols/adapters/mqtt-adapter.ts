/**
 * MQTT 协议适配器
 * 基于 MQTT Core Service 实现协议适配器接口
 */

import { BaseProtocolAdapter } from './adapter-base';
import { ProtocolType, ProtocolConfig, ProtocolMessage } from '../protocol-types';
import { MQTTCoreService } from '../../mqtt/mqtt-core';
import { MQTTConfig } from '../../mqtt/types';
import { TopicUtils } from '../../mqtt/topic-utils';

export class MQTTAdapter extends BaseProtocolAdapter {
  private mqttCore: MQTTCoreService;

  constructor(config: ProtocolConfig) {
    super(ProtocolType.MQTT, config);
    
    // 构建MQTT配置
    const mqttConfig: MQTTConfig = {
      enabled: config.enabled,
      brokerUrl: config.host || 'mqtt://emqx:1883',
      port: config.port || 1883,
      username: config.username,
      password: config.password,
      clientId: config.clientId || `iot-gateway-${Date.now()}`,
      clean: true,
      connectTimeout: 30000,
      reconnectPeriod: 5000,
      will: {
        topic: 'system/gateway/status',
        payload: JSON.stringify({ status: 'offline', timestamp: new Date() }),
        qos: 1,
        retain: true
      }
    };

    this.mqttCore = new MQTTCoreService(mqttConfig);
    this.setupMQTTEventHandlers();
  }

  /**
   * 设置MQTT事件处理器
   */
  private setupMQTTEventHandlers(): void {
    this.mqttCore.on('connected', () => {
      this.updateStatus({ connected: true });
      this.subscribeToDefaultTopics();
    });

    this.mqttCore.on('disconnected', () => {
      this.updateStatus({ connected: false });
    });

    this.mqttCore.on('reconnecting', (attempts: number) => {
      this.incrementReconnectAttempts();
    });

    this.mqttCore.on('error', (error: Error) => {
      this.updateStatus({ error: error.message });
    });

    this.mqttCore.on('message', (mqttMessage) => {
      // 转换为协议消息格式
      const protocolMessage: ProtocolMessage = {
        protocol: ProtocolType.MQTT,
        topic: mqttMessage.topic,
        payload: mqttMessage.payload,
        qos: mqttMessage.qos,
        retain: mqttMessage.retain,
        timestamp: mqttMessage.timestamp,
        source: 'mqtt-adapter'
      };

      // 分发消息事件
      this.emit('message', protocolMessage);
    });
  }

  /**
   * 订阅默认主题
   */
  private async subscribeToDefaultTopics(): Promise<void> {
    const patterns = TopicUtils.getSubscriptionPatterns();
    
    for (const pattern of patterns) {
      try {
        await this.mqttCore.subscribe(pattern.pattern);
        this.log('info', `Subscribed to pattern: ${pattern.pattern}`);
      } catch (error) {
        this.log('error', `Failed to subscribe to pattern: ${pattern.pattern}`, { error });
      }
    }
  }

  /**
   * 初始化适配器
   */
  async initialize(): Promise<void> {
    try {
      this.validateConfig();
      await this.mqttCore.initialize();
      this.initialized = true;
      this.log('info', 'MQTT adapter initialized');
    } catch (error) {
      this.log('error', 'Failed to initialize MQTT adapter', { error });
      throw error;
    }
  }

  /**
   * 发布消息
   */
  async publish(topic: string, payload: any, options: any = {}): Promise<boolean> {
    try {
      const success = await this.mqttCore.publish(topic, payload, {
        qos: options.qos || 1,
        retain: options.retain || false
      });

      if (success) {
        this.log('debug', 'Published message', { topic, qos: options.qos });
      }

      return success;
    } catch (error) {
      this.log('error', 'Failed to publish message', { topic, error });
      return false;
    }
  }

  /**
   * 订阅主题
   */
  async subscribe(topic: string, options: any = {}): Promise<boolean> {
    try {
      const success = await this.mqttCore.subscribe(topic, {
        qos: options.qos || 1
      });

      if (success) {
        this.log('debug', 'Subscribed to topic', { topic, qos: options.qos });
      }

      return success;
    } catch (error) {
      this.log('error', 'Failed to subscribe to topic', { topic, error });
      return false;
    }
  }

  /**
   * 取消订阅主题
   */
  async unsubscribe(topic: string): Promise<boolean> {
    try {
      const success = await this.mqttCore.unsubscribe(topic);

      if (success) {
        this.log('debug', 'Unsubscribed from topic', { topic });
      }

      return success;
    } catch (error) {
      this.log('error', 'Failed to unsubscribe from topic', { topic, error });
      return false;
    }
  }

  /**
   * 关闭适配器
   */
  async shutdown(): Promise<void> {
    try {
      await this.mqttCore.shutdown();
      this.initialized = false;
      this.updateStatus({ connected: false });
      this.log('info', 'MQTT adapter shutdown');
    } catch (error) {
      this.log('error', 'Failed to shutdown MQTT adapter', { error });
      throw error;
    }
  }

  /**
   * 获取MQTT连接信息
   */
  getMQTTConnectionInfo() {
    return this.mqttCore.getConnectionInfo();
  }

  /**
   * 检查MQTT连接状态
   */
  isMQTTConnected(): boolean {
    return this.mqttCore.isConnected();
  }
}
