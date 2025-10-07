/**
 * 多协议统一管理层（ProtocolAdapter）
 * 管理所有协议适配器，提供统一的接口
 */

import { EventEmitter } from 'events';
import { logger } from '@/common/logger';
import { ProtocolType, ProtocolConfig, ProtocolMessage, ProtocolAdapter } from './protocol-types';
import { BaseProtocolAdapter } from './adapters/adapter-base';
import { MQTTAdapter } from './adapters/mqtt-adapter';
import { HTTPAdapter } from './adapters/http-adapter';
import { WebSocketAdapter } from './adapters/websocket-adapter';
import { UDPAdapter } from './adapters/udp-adapter';
import { CoAPAdapter } from './adapters/coap-adapter';
import { eventBus, MessageType } from '../event-bus';

export interface ProtocolManagerConfig {
  mqtt?: ProtocolConfig;
  websocket?: ProtocolConfig;
  http?: ProtocolConfig;
  udp?: ProtocolConfig;
  socketIO?: any; // Socket.IO 实例
}

export class ProtocolManager extends EventEmitter {
  private static instance: ProtocolManager;
  private adapters: Map<ProtocolType, ProtocolAdapter> = new Map();
  private config: ProtocolManagerConfig;

  private constructor(config: ProtocolManagerConfig) {
    super();
    this.config = config;
    this.setupEventBusHandlers();
  }

  static getInstance(config?: ProtocolManagerConfig): ProtocolManager {
    if (!ProtocolManager.instance && config) {
      ProtocolManager.instance = new ProtocolManager(config);
    }
    return ProtocolManager.instance;
  }

  /**
   * 设置事件总线处理器
   */
  private setupEventBusHandlers(): void {
    // 监听所有消息类型
    eventBus.subscribeAll((message) => {
      this.emit('message', message);
    });
  }

  /**
   * 初始化所有协议适配器
   */
  async initialize(): Promise<void> {
    try {
      // 初始化MQTT适配器
      if (this.config.mqtt?.enabled) {
        await this.initializeMQTT();
      }

      // 初始化WebSocket适配器
      if (this.config.websocket?.enabled) {
        await this.initializeWebSocket();
      }

      // 初始化HTTP适配器
      if (this.config.http?.enabled) {
        await this.initializeHTTP();
      }

      // 初始化UDP适配器
      if (this.config.udp?.enabled) {
        await this.initializeUDP();
      }

      logger.info('Protocol Manager initialized', {
        adapters: Array.from(this.adapters.keys())
      });
    } catch (error) {
      logger.error('Failed to initialize Protocol Manager', error);
      throw error;
    }
  }

  /**
   * 初始化MQTT适配器
   */
  private async initializeMQTT(): Promise<void> {
    try {
      const adapter = new MQTTAdapter(this.config.mqtt!);
      await adapter.initialize();
      
      // 监听MQTT消息
      adapter.on('message', (message: ProtocolMessage) => {
        this.handleProtocolMessage(message);
      });

      adapter.on('connected', () => {
        logger.info('MQTT adapter connected');
        this.emit('mqttConnected');
      });

      adapter.on('disconnected', () => {
        logger.warn('MQTT adapter disconnected');
        this.emit('mqttDisconnected');
      });

      adapter.on('error', (error) => {
        logger.error('MQTT adapter error', { error });
        this.emit('mqttError', error);
      });

      this.adapters.set(ProtocolType.MQTT, adapter);
      logger.info('MQTT adapter initialized');
    } catch (error) {
      logger.error('Failed to initialize MQTT adapter', error);
      throw error;
    }
  }

  /**
   * 初始化WebSocket适配器
   */
  private async initializeWebSocket(): Promise<void> {
    try {
      const adapter = new WebSocketAdapter(this.config.websocket!, this.config.socketIO);
      await adapter.initialize();
      
      // 监听WebSocket消息
      adapter.on('message', (message: ProtocolMessage) => {
        this.handleProtocolMessage(message);
      });

      adapter.on('connected', () => {
        logger.info('WebSocket adapter connected');
        this.emit('websocketConnected');
      });

      adapter.on('disconnected', () => {
        logger.warn('WebSocket adapter disconnected');
        this.emit('websocketDisconnected');
      });

      adapter.on('error', (error) => {
        logger.error('WebSocket adapter error', { error });
        this.emit('websocketError', error);
      });

      this.adapters.set(ProtocolType.WEBSOCKET, adapter);
      logger.info('WebSocket adapter initialized');
    } catch (error) {
      logger.error('Failed to initialize WebSocket adapter', error);
      throw error;
    }
  }

  /**
   * 初始化HTTP适配器
   */
  private async initializeHTTP(): Promise<void> {
    try {
      const adapter = new HTTPAdapter(this.config.http!);
      await adapter.initialize();
      
      // 监听HTTP消息
      adapter.on('message', (message: ProtocolMessage) => {
        this.handleProtocolMessage(message);
      });

      adapter.on('connected', () => {
        logger.info('HTTP adapter connected');
        this.emit('httpConnected');
      });

      adapter.on('disconnected', () => {
        logger.warn('HTTP adapter disconnected');
        this.emit('httpDisconnected');
      });

      adapter.on('error', (error) => {
        logger.error('HTTP adapter error', { error });
        this.emit('httpError', error);
      });

      this.adapters.set(ProtocolType.HTTP, adapter);
      logger.info('HTTP adapter initialized');
    } catch (error) {
      logger.error('Failed to initialize HTTP adapter', error);
      throw error;
    }
  }

  /**
   * 初始化UDP适配器
   */
  private async initializeUDP(): Promise<void> {
    try {
      const adapter = new UDPAdapter(this.config.udp!);
      await adapter.initialize();
      
      // 监听UDP消息
      adapter.on('message', (message: ProtocolMessage) => {
        this.handleProtocolMessage(message);
      });

      adapter.on('connected', () => {
        logger.info('UDP adapter connected');
        this.emit('udpConnected');
      });

      adapter.on('disconnected', () => {
        logger.warn('UDP adapter disconnected');
        this.emit('udpDisconnected');
      });

      adapter.on('error', (error) => {
        logger.error('UDP adapter error', { error });
        this.emit('udpError', error);
      });

      this.adapters.set(ProtocolType.UDP, adapter);
      logger.info('UDP adapter initialized');
    } catch (error) {
      logger.error('Failed to initialize UDP adapter', error);
      throw error;
    }
  }

  /**
   * 处理协议消息
   */
  private async handleProtocolMessage(message: ProtocolMessage): Promise<void> {
    try {
      // 解析主题信息
      const topicInfo = this.parseTopic(message.topic || '');
      if (!topicInfo) {
        logger.warn('Cannot parse topic', { topic: message.topic });
        return;
      }

      // 根据主题确定消息类型
      const messageType = this.getMessageTypeFromTopic(message.topic || '');
      
      // 创建标准化消息
      const standardizedMessage = {
        type: messageType,
        tenantId: topicInfo.tenantId,
        deviceId: topicInfo.deviceId,
        timestamp: message.timestamp,
        protocol: message.protocol,
        source: message.source,
        ...this.parsePayload(message.payload)
      };

      // 发布到事件总线
      await eventBus.publish(messageType, standardizedMessage as any);

      logger.debug('Protocol message processed', {
        protocol: message.protocol,
        deviceId: topicInfo.deviceId,
        messageType
      });
    } catch (error) {
      logger.error('Failed to handle protocol message', { message, error });
    }
  }

  /**
   * 解析主题信息
   */
  private parseTopic(topic: string): { tenantId: string; deviceType: string; deviceId: string } | null {
    const parts = topic.split('/');
    if (parts.length >= 4 && parts[0] === 'iot') {
      return {
        tenantId: parts[1],
        deviceType: parts[2],
        deviceId: parts[3]
      };
    }
    return null;
  }

  /**
   * 根据主题确定消息类型
   */
  private getMessageTypeFromTopic(topic: string): MessageType {
    if (topic.includes('/telemetry')) return MessageType.TELEMETRY;
    if (topic.includes('/status')) return MessageType.STATUS_CHANGE;
    if (topic.includes('/event')) return MessageType.DEVICE_EVENT;
    if (topic.includes('/cmdres')) return MessageType.COMMAND_RESPONSE;
    if (topic.includes('/ota/progress')) return MessageType.OTA_PROGRESS;
    if (topic.includes('/ota/status')) return MessageType.OTA_STATUS;
    return MessageType.TELEMETRY;
  }

  /**
   * 解析消息载荷
   */
  private parsePayload(payload: Buffer | string | object): any {
    if (Buffer.isBuffer(payload)) {
      return JSON.parse(payload.toString());
    }
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch {
        return { data: payload };
      }
    }
    return payload;
  }

  /**
   * 发送消息到设备
   */
  async sendToDevice(
    tenantId: string,
    deviceId: string,
    deviceType: string,
    messageType: MessageType,
    payload: any,
    protocol: ProtocolType = ProtocolType.MQTT
  ): Promise<boolean> {
    try {
      const adapter = this.adapters.get(protocol);
      if (!adapter) {
        logger.warn(`Protocol adapter not found: ${protocol}`);
        return false;
      }

      // 生成主题
      const topic = this.generateTopic(tenantId, deviceType, deviceId, messageType);
      
      // 发送消息
      const success = await adapter.publish(topic, payload);
      
      if (success) {
        logger.debug('Message sent to device', {
          deviceId,
          messageType,
          protocol,
          topic
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to send message to device', {
        deviceId,
        messageType,
        protocol,
        error
      });
      return false;
    }
  }

  /**
   * 生成主题
   */
  private generateTopic(tenantId: string, deviceType: string, deviceId: string, messageType: MessageType): string {
    const channel = this.getMessageChannel(messageType);
    return `iot/${tenantId}/${deviceType}/${deviceId}/${channel}`;
  }

  /**
   * 根据消息类型获取通道名
   */
  private getMessageChannel(messageType: MessageType): string {
    switch (messageType) {
      case MessageType.DEVICE_COMMAND: return 'cmd';
      case MessageType.STATUS_CHANGE: return 'status';
      case MessageType.DEVICE_EVENT: return 'event';
      case MessageType.COMMAND_RESPONSE: return 'cmdres';
      case MessageType.OTA_PROGRESS: return 'ota/progress';
      case MessageType.OTA_STATUS: return 'ota/status';
      default: return 'telemetry';
    }
  }

  /**
   * 获取适配器状态
   */
  getAdapterStatus(protocol: ProtocolType): any {
    const adapter = this.adapters.get(protocol);
    return adapter ? adapter.status : null;
  }

  /**
   * 获取所有适配器状态
   */
  getAllAdapterStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    for (const [protocol, adapter] of this.adapters) {
      status[protocol] = adapter.status;
    }
    return status;
  }

  /**
   * 注册新的协议适配器
   */
  registerAdapter(adapter: ProtocolAdapter): void {
    this.adapters.set(adapter.protocol, adapter);
    logger.info(`Protocol adapter registered: ${adapter.protocol}`);
  }

  /**
   * 注销协议适配器
   */
  unregisterAdapter(protocol: ProtocolType): void {
    const adapter = this.adapters.get(protocol);
    if (adapter) {
      this.adapters.delete(protocol);
      logger.info(`Protocol adapter unregistered: ${protocol}`);
    }
  }

  /**
   * 获取所有已注册的协议类型
   */
  getRegisteredProtocols(): ProtocolType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 关闭所有适配器
   */
  async shutdown(): Promise<void> {
    try {
      for (const [protocol, adapter] of this.adapters) {
        await adapter.shutdown();
        logger.info(`Protocol adapter shutdown: ${protocol}`);
      }
      
      this.adapters.clear();
      logger.info('Protocol Manager shutdown');
    } catch (error) {
      logger.error('Failed to shutdown Protocol Manager', error);
    }
  }
}

// 导出全局实例
export const protocolManager = ProtocolManager.getInstance();
