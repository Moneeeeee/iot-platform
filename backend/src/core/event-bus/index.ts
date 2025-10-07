/**
 * 统一事件总线
 * 让所有协议通过事件总线交互
 */

import { EventEmitter } from 'events';
import { logger } from '@/common/logger';

export enum MessageType {
  // 设备遥测数据
  TELEMETRY = 'telemetry',
  
  // 设备状态变更
  STATUS_CHANGE = 'status_change',
  
  // 设备事件
  DEVICE_EVENT = 'device_event',
  
  // 一次性测量
  MEASUREMENT = 'measurement',
  
  // 设备指令
  DEVICE_COMMAND = 'device_command',
  
  // 设备指令响应
  COMMAND_RESPONSE = 'command_response',
  
  // OTA 相关
  OTA_PROGRESS = 'ota_progress',
  OTA_STATUS = 'ota_status',
  
  // 系统事件
  SYSTEM_EVENT = 'system_event',
}

export interface BaseMessage {
  type: MessageType;
  tenantId: string;
  deviceId: string;
  timestamp: Date;
  protocol: string;
  source: string;
}

export interface TelemetryMessage extends BaseMessage {
  type: MessageType.TELEMETRY;
  data: Record<string, any>;
}

export interface StatusChangeMessage extends BaseMessage {
  type: MessageType.STATUS_CHANGE;
  status: string;
  previousStatus?: string;
}

export interface DeviceEventMessage extends BaseMessage {
  type: MessageType.DEVICE_EVENT;
  eventType: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  data?: Record<string, any>;
}

export interface OTAProgressMessage extends BaseMessage {
  type: MessageType.OTA_PROGRESS;
  progress: number;
  status: string;
  message?: string;
}

export interface OTAStatusMessage extends BaseMessage {
  type: MessageType.OTA_STATUS;
  status: 'idle' | 'downloading' | 'installing' | 'success' | 'failed';
  version?: string;
  error?: string;
}

export interface CommandResponseMessage extends BaseMessage {
  type: MessageType.COMMAND_RESPONSE;
  commandId: string;
  success: boolean;
  response?: any;
  error?: string;
}

export type Message = 
  | TelemetryMessage 
  | StatusChangeMessage 
  | DeviceEventMessage 
  | OTAProgressMessage 
  | OTAStatusMessage 
  | CommandResponseMessage;

export class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(100); // 增加最大监听器数量
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * 发布消息到事件总线
   */
  async publish(messageType: MessageType, message: Message): Promise<void> {
    try {
      this.emit(messageType, message);
      this.emit('message', message); // 通用消息事件
      
      logger.debug('Message published to event bus', {
        type: messageType,
        deviceId: message.deviceId,
        tenantId: message.tenantId
      });
    } catch (error) {
      logger.error('Failed to publish message to event bus', { messageType, error });
      throw error;
    }
  }

  /**
   * 订阅消息类型
   */
  subscribe(messageType: MessageType, handler: (message: Message) => void): void {
    this.on(messageType, handler);
    logger.debug('Subscribed to message type', { messageType });
  }

  /**
   * 取消订阅消息类型
   */
  unsubscribe(messageType: MessageType, handler: (message: Message) => void): void {
    this.off(messageType, handler);
    logger.debug('Unsubscribed from message type', { messageType });
  }

  /**
   * 订阅所有消息
   */
  subscribeAll(handler: (message: Message) => void): void {
    this.on('message', handler);
    logger.debug('Subscribed to all messages');
  }

  /**
   * 取消订阅所有消息
   */
  unsubscribeAll(handler: (message: Message) => void): void {
    this.off('message', handler);
    logger.debug('Unsubscribed from all messages');
  }

  /**
   * 获取事件总线统计信息
   */
  getStats(): {
    listenerCount: number;
    maxListeners: number;
    eventNames: string[];
  } {
    return {
      listenerCount: this.listenerCount('message'),
      maxListeners: this.getMaxListeners(),
      eventNames: this.eventNames().map(name => String(name))
    };
  }
}

// 导出全局事件总线实例
export const eventBus = EventBus.getInstance();

// 为了兼容性，导出旧的名称
export const messageBus = eventBus;
export const Channels = MessageType;
