/**
 * MQTT服务
 * 处理MQTT协议通信和设备消息管理
 */

import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';
import { ProtocolType, DeviceData } from '@/types';

/**
 * MQTT服务类
 */
export class MQTTService extends EventEmitter {
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  /**
   * 初始化MQTT服务
   */
  public async initialize(): Promise<void> {
    try {
      const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
      const clientId = process.env.MQTT_CLIENT_ID || 'iot-platform-gateway';
      const username = process.env.MQTT_USERNAME;
      const password = process.env.MQTT_PASSWORD;

      // MQTT连接选项
      const options: mqtt.IClientOptions = {
        clientId,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: this.reconnectInterval,
        username,
        password,
        will: {
          topic: 'system/gateway/status',
          payload: JSON.stringify({
            status: 'offline',
            timestamp: new Date().toISOString(),
          }),
          qos: 1,
          retain: true,
        },
      };

      // 创建MQTT客户端
      this.client = mqtt.connect(brokerUrl, options);

      // 设置事件监听器
      this.setupEventListeners();

      logger.info('MQTT service initialized', { brokerUrl, clientId });

    } catch (error) {
      logger.error('Failed to initialize MQTT service:', error);
      throw error;
    }
  }

  /**
   * 设置MQTT事件监听器
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // 连接成功事件
    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info('MQTT client connected successfully');
      
      // 发布网关在线状态
      this.publish('system/gateway/status', {
        status: 'online',
        timestamp: new Date().toISOString(),
      }, { qos: 1, retain: true });

      // 订阅设备主题
      this.subscribeToDeviceTopics();
      
      this.emit('connected');
    });

    // 连接断开事件
    this.client.on('disconnect', () => {
      this.isConnected = false;
      logger.warn('MQTT client disconnected');
      this.emit('disconnected');
    });

    // 重连事件
    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      logger.info(`MQTT client reconnecting... (attempt ${this.reconnectAttempts})`);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('MQTT client max reconnection attempts reached');
        this.emit('maxReconnectAttemptsReached');
      }
    });

    // 错误事件
    this.client.on('error', (error) => {
      logger.error('MQTT client error:', error);
      this.emit('error', error);
    });

    // 消息接收事件
    this.client.on('message', (topic, payload, packet) => {
      this.handleMessage(topic, payload, packet);
    });

    // 关闭事件
    this.client.on('close', () => {
      this.isConnected = false;
      logger.info('MQTT client connection closed');
      this.emit('closed');
    });
  }

  /**
   * 订阅设备主题
   */
  private subscribeToDeviceTopics(): void {
    if (!this.client || !this.isConnected) return;

    const topics = [
      'devices/+/data',      // 设备数据
      'devices/+/status',    // 设备状态
      'devices/+/control',   // 设备控制
      'devices/+/alerts',    // 设备告警
      'system/+/heartbeat',  // 系统心跳
    ];

    topics.forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          logger.error(`Failed to subscribe to topic ${topic}:`, error);
        } else {
          logger.info(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  /**
   * 处理接收到的消息
   * @param topic 主题
   * @param payload 消息载荷
   * @param packet 消息包
   */
  private handleMessage(topic: string, payload: Buffer, packet: any): void {
    try {
      const message = JSON.parse(payload.toString());
      
      // 解析主题获取设备ID
      const topicParts = topic.split('/');
      const deviceId = topicParts[1];
      const messageType = topicParts[2];

      logger.debug('MQTT message received', {
        topic,
        deviceId,
        messageType,
        payloadSize: payload.length,
      });

      // 根据消息类型处理
      switch (messageType) {
        case 'data':
          this.handleDeviceData(deviceId, message);
          break;
        case 'status':
          this.handleDeviceStatus(deviceId, message);
          break;
        case 'control':
          this.handleDeviceControl(deviceId, message);
          break;
        case 'alerts':
          this.handleDeviceAlert(deviceId, message);
          break;
        case 'heartbeat':
          this.handleHeartbeat(deviceId, message);
          break;
        default:
          logger.warn('Unknown message type:', messageType);
      }

    } catch (error) {
      logger.error('Failed to parse MQTT message:', {
        topic,
        error: error.message,
        payload: payload.toString(),
      });
    }
  }

  /**
   * 处理设备数据消息
   * @param deviceId 设备ID
   * @param data 数据
   */
  private handleDeviceData(deviceId: string, data: any): void {
    logger.deviceData(deviceId, data, 'mqtt');
    
    // 触发设备数据事件
    this.emit('deviceData', {
      deviceId,
      data,
      protocol: ProtocolType.MQTT,
      timestamp: new Date(),
    });
  }

  /**
   * 处理设备状态消息
   * @param deviceId 设备ID
   * @param status 状态
   */
  private handleDeviceStatus(deviceId: string, status: any): void {
    logger.info('Device status update', { deviceId, status });
    
    // 触发设备状态事件
    this.emit('deviceStatus', {
      deviceId,
      status,
      timestamp: new Date(),
    });
  }

  /**
   * 处理设备控制消息
   * @param deviceId 设备ID
   * @param control 控制信息
   */
  private handleDeviceControl(deviceId: string, control: any): void {
    logger.info('Device control response', { deviceId, control });
    
    // 触发设备控制事件
    this.emit('deviceControl', {
      deviceId,
      control,
      timestamp: new Date(),
    });
  }

  /**
   * 处理设备告警消息
   * @param deviceId 设备ID
   * @param alert 告警信息
   */
  private handleDeviceAlert(deviceId: string, alert: any): void {
    logger.alert(alert.id || 'unknown', deviceId, alert.level, alert.message);
    
    // 触发设备告警事件
    this.emit('deviceAlert', {
      deviceId,
      alert,
      timestamp: new Date(),
    });
  }

  /**
   * 处理心跳消息
   * @param deviceId 设备ID
   * @param heartbeat 心跳信息
   */
  private handleHeartbeat(deviceId: string, heartbeat: any): void {
    logger.debug('Device heartbeat', { deviceId, heartbeat });
    
    // 触发心跳事件
    this.emit('heartbeat', {
      deviceId,
      heartbeat,
      timestamp: new Date(),
    });
  }

  /**
   * 发布消息到MQTT主题
   * @param topic 主题
   * @param message 消息
   * @param options 发布选项
   */
  public publish(topic: string, message: any, options?: mqtt.IClientPublishOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      const payload = JSON.stringify(message);
      
      this.client!.publish(topic, payload, options || {}, (error) => {
        if (error) {
          logger.error('Failed to publish MQTT message:', { topic, error });
          reject(error);
        } else {
          logger.debug('MQTT message published', { topic, payloadSize: payload.length });
          resolve();
        }
      });
    });
  }

  /**
   * 向设备发送控制命令
   * @param deviceId 设备ID
   * @param command 命令
   * @param parameters 参数
   */
  public async sendDeviceCommand(deviceId: string, command: string, parameters?: any): Promise<void> {
    const topic = `devices/${deviceId}/control`;
    const message = {
      command,
      parameters,
      timestamp: new Date().toISOString(),
      source: 'gateway',
    };

    await this.publish(topic, message, { qos: 1 });
    
    logger.info('Device command sent', { deviceId, command, parameters });
  }

  /**
   * 订阅主题
   * @param topic 主题
   * @param options 订阅选项
   */
  public subscribe(topic: string, options?: mqtt.IClientSubscribeOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client!.subscribe(topic, options || {}, (error) => {
        if (error) {
          logger.error('Failed to subscribe to topic:', { topic, error });
          reject(error);
        } else {
          logger.info('Subscribed to topic:', topic);
          resolve();
        }
      });
    });
  }

  /**
   * 取消订阅主题
   * @param topic 主题
   */
  public unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client!.unsubscribe(topic, (error) => {
        if (error) {
          logger.error('Failed to unsubscribe from topic:', { topic, error });
          reject(error);
        } else {
          logger.info('Unsubscribed from topic:', topic);
          resolve();
        }
      });
    });
  }

  /**
   * 获取连接状态
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 获取客户端信息
   */
  public getClientInfo(): any {
    if (!this.client) return null;
    
    return {
      connected: this.isConnected,
      clientId: this.client.options.clientId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * 关闭MQTT连接
   */
  public async close(): Promise<void> {
    if (this.client) {
      // 发布离线状态
      await this.publish('system/gateway/status', {
        status: 'offline',
        timestamp: new Date().toISOString(),
      }, { qos: 1, retain: true });

      // 关闭连接
      this.client.end();
      this.client = null;
      this.isConnected = false;
      
      logger.info('MQTT service closed');
    }
  }
}

// 导出单例实例
export const mqttService = new MQTTService();
