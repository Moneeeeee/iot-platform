/**
 * MQTT/WebSocket/HTTP 接入适配器
 * 统一处理不同协议的设备接入
 */

import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { MQTTService } from '../core/mqtt';
import { WebSocketService } from '../core/websocket';
import { UDPService } from '../core/udp';
import { messageBus } from '../core/message-bus';
import { MessageType } from '../core/message-bus';
import { logger } from '../common/logger';

export interface DeviceMessage {
  tenantId: string;
  deviceId: string;
  deviceType: string;
  messageType: MessageType;
  payload: any;
  timestamp: Date;
  protocol: 'mqtt' | 'websocket' | 'http' | 'udp';
}

export interface AdapterConfig {
  mqtt: {
    enabled: boolean;
    brokerUrl: string;
    port: number;
    username?: string;
    password?: string;
  };
  websocket: {
    enabled: boolean;
    port: number;
    cors: any;
  };
  http: {
    enabled: boolean;
    port: number;
    rateLimit: number;
  };
  udp: {
    enabled: boolean;
    port: number;
    host: string;
  };
}

export class ProtocolAdapter extends EventEmitter {
  private static instance: ProtocolAdapter;
  private mqttService?: MQTTService;
  private wsService?: WebSocketService;
  private udpService?: UDPService;
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    super();
    this.config = config;
  }

  static getInstance(config?: AdapterConfig): ProtocolAdapter {
    if (!ProtocolAdapter.instance && config) {
      ProtocolAdapter.instance = new ProtocolAdapter(config);
    }
    return ProtocolAdapter.instance;
  }

  /**
   * 初始化所有适配器
   */
  async initialize(): Promise<void> {
    try {
      // 初始化 MQTT 适配器
      if (this.config.mqtt.enabled) {
        await this.initializeMQTT();
      }

      // 初始化 WebSocket 适配器
      if (this.config.websocket.enabled) {
        await this.initializeWebSocket();
      }

      // 初始化 UDP 适配器
      if (this.config.udp.enabled) {
        await this.initializeUDP();
      }

      logger.info('All protocol adapters initialized');
    } catch (error) {
      logger.error('Failed to initialize protocol adapters', error);
      throw error;
    }
  }

  /**
   * 初始化 MQTT 适配器
   */
  private async initializeMQTT(): Promise<void> {
    this.mqttService = new MQTTService();
    await this.mqttService.initialize();

    // 监听 MQTT 消息
    this.mqttService.on('message', (topic: string, payload: Buffer, deviceId: string) => {
      this.handleMQTTMessage(topic, payload, deviceId);
    });

    logger.info('MQTT adapter initialized');
  }

  /**
   * 初始化 WebSocket 适配器
   */
  private async initializeWebSocket(): Promise<void> {
    // WebSocket 服务需要 Socket.IO 实例，这里先创建基础结构
    this.wsService = new WebSocketService({} as SocketIOServer);
    await this.wsService.initialize();

    // 监听 WebSocket 消息
    this.wsService.on('message', (data: any, deviceId: string) => {
      this.handleWebSocketMessage(data, deviceId);
    });

    logger.info('WebSocket adapter initialized');
  }

  /**
   * 初始化 UDP 适配器
   */
  private async initializeUDP(): Promise<void> {
    this.udpService = new UDPService();
    await this.udpService.initialize();

    // 监听 UDP 消息
    this.udpService.on('message', (data: Buffer, deviceId: string) => {
      this.handleUDPMessage(data, deviceId);
    });

    logger.info('UDP adapter initialized');
  }

  /**
   * 处理 MQTT 消息
   */
  private async handleMQTTMessage(topic: string, payload: Buffer, deviceId: string): Promise<void> {
    try {
      const message = JSON.parse(payload.toString());
      const { tenantId, deviceType } = this.parseTopic(topic);

      const deviceMessage: DeviceMessage = {
        tenantId,
        deviceId,
        deviceType,
        messageType: this.getMessageType(topic),
        payload: message,
        timestamp: new Date(),
        protocol: 'mqtt'
      };

      await this.processDeviceMessage(deviceMessage);
    } catch (error) {
      logger.error('Failed to process MQTT message', { topic, deviceId, error });
    }
  }

  /**
   * 处理 WebSocket 消息
   */
  private async handleWebSocketMessage(data: any, deviceId: string): Promise<void> {
    try {
      const { tenantId, deviceType, messageType, payload } = data;

      const deviceMessage: DeviceMessage = {
        tenantId,
        deviceId,
        deviceType,
        messageType,
        payload,
        timestamp: new Date(),
        protocol: 'websocket'
      };

      await this.processDeviceMessage(deviceMessage);
    } catch (error) {
      logger.error('Failed to process WebSocket message', { deviceId, error });
    }
  }

  /**
   * 处理 UDP 消息
   */
  private async handleUDPMessage(data: Buffer, deviceId: string): Promise<void> {
    try {
      const message = JSON.parse(data.toString());
      const { tenantId, deviceType } = message;

      const deviceMessage: DeviceMessage = {
        tenantId,
        deviceId,
        deviceType,
        messageType: MessageType.TELEMETRY,
        payload: message.data,
        timestamp: new Date(),
        protocol: 'udp'
      };

      await this.processDeviceMessage(deviceMessage);
    } catch (error) {
      logger.error('Failed to process UDP message', { deviceId, error });
    }
  }

  /**
   * 统一处理设备消息
   */
  private async processDeviceMessage(message: DeviceMessage): Promise<void> {
    try {
      // 发送到消息总线
      await messageBus.publish(message.messageType, {
        tenantId: message.tenantId,
        deviceId: message.deviceId,
        deviceType: message.deviceType,
        payload: message.payload,
        timestamp: message.timestamp,
        protocol: message.protocol
      });

      // 触发事件
      this.emit('deviceMessage', message);

      logger.debug('Processed device message', {
        deviceId: message.deviceId,
        messageType: message.messageType,
        protocol: message.protocol
      });
    } catch (error) {
      logger.error('Failed to process device message', { message, error });
    }
  }

  /**
   * 解析 MQTT 主题
   */
  private parseTopic(topic: string): { tenantId: string; deviceType: string; deviceId: string } {
    const parts = topic.split('/');
    if (parts.length < 4 || parts[0] !== 'iot') {
      throw new Error('Invalid MQTT topic format');
    }

    return {
      tenantId: parts[1],
      deviceType: parts[2],
      deviceId: parts[3]
    };
  }

  /**
   * 根据主题确定消息类型
   */
  private getMessageType(topic: string): MessageType {
    if (topic.includes('/telemetry')) return MessageType.TELEMETRY;
    if (topic.includes('/status')) return MessageType.STATUS_CHANGE;
    if (topic.includes('/event')) return MessageType.DEVICE_EVENT;
    if (topic.includes('/cmdres')) return MessageType.COMMAND_RESPONSE;
    if (topic.includes('/ota/progress')) return MessageType.OTA_PROGRESS;
    return MessageType.TELEMETRY;
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
    protocol: 'mqtt' | 'websocket' | 'http' = 'mqtt'
  ): Promise<boolean> {
    try {
      const topic = `iot/${tenantId}/${deviceType}/${deviceId}/${this.getChannelFromMessageType(messageType)}`;
      
      switch (protocol) {
        case 'mqtt':
          if (this.mqttService) {
            await this.mqttService.publish(topic, JSON.stringify(payload));
            return true;
          }
          break;
          
        case 'websocket':
          if (this.wsService) {
            await this.wsService.sendToDevice(deviceId, {
              type: messageType,
              payload,
              timestamp: new Date()
            });
            return true;
          }
          break;
      }

      return false;
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
   * 根据消息类型获取通道名
   */
  private getChannelFromMessageType(messageType: MessageType): string {
    switch (messageType) {
      case MessageType.DEVICE_COMMAND: return 'cmd';
      case MessageType.STATUS_CHANGE: return 'status';
      case MessageType.DEVICE_EVENT: return 'event';
      default: return 'data';
    }
  }

  /**
   * 关闭所有适配器
   */
  async shutdown(): Promise<void> {
    try {
      if (this.mqttService) {
        await this.mqttService.disconnect();
      }
      
      if (this.wsService) {
        await this.wsService.shutdown();
      }
      
      if (this.udpService) {
        await this.udpService.shutdown();
      }

      logger.info('All protocol adapters shutdown');
    } catch (error) {
      logger.error('Failed to shutdown protocol adapters', error);
    }
  }
}

export const protocolAdapter = ProtocolAdapter.getInstance();
