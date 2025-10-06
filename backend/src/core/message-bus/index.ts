/**
 * 统一消息总线
 * 支持多种传输层：EventEmitter（开发）、Redis Pub/Sub（生产）
 * 所有协议（MQTT/UDP/WebSocket）通过此总线统一处理
 */

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { logger } from '../common/logger';
import { configManager } from '../common/config/config';

// ==========================================
// 消息类型定义
// ==========================================

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
  protocol: string; // 'mqtt' | 'udp' | 'websocket' | 'http'
  source: string;   // 来源标识
}

export interface TelemetryMessage extends BaseMessage {
  type: MessageType.TELEMETRY;
  metrics: Record<string, any>; // 遥测数据
  quality?: 'GOOD' | 'UNCERTAIN' | 'BAD';
}

export interface StatusChangeMessage extends BaseMessage {
  type: MessageType.STATUS_CHANGE;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'MAINTENANCE';
  previousStatus?: string;
  context?: Record<string, any>;
}

export interface DeviceEventMessage extends BaseMessage {
  type: MessageType.DEVICE_EVENT;
  eventType: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  data: Record<string, any>;
  title?: string;
  message?: string;
}

export interface MeasurementMessage extends BaseMessage {
  type: MessageType.MEASUREMENT;
  measurementType: string;
  value: any;
  metadata?: Record<string, any>;
}

export interface DeviceCommandMessage extends BaseMessage {
  type: MessageType.DEVICE_COMMAND;
  commandId: string;
  commandName: string;
  params: Record<string, any>;
  timeout?: number;
}

export interface CommandResponseMessage extends BaseMessage {
  type: MessageType.COMMAND_RESPONSE;
  commandId: string;
  success: boolean;
  result?: any;
  error?: string;
}

export interface OTAProgressMessage extends BaseMessage {
  type: MessageType.OTA_PROGRESS;
  rolloutId: string;
  progress: number; // 0-100
  stage: 'DOWNLOADING' | 'DOWNLOADED' | 'INSTALLING' | 'VERIFYING';
}

export interface OTAStatusMessage extends BaseMessage {
  type: MessageType.OTA_STATUS;
  rolloutId: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  error?: string;
}

export type Message = 
  | TelemetryMessage 
  | StatusChangeMessage 
  | DeviceEventMessage 
  | MeasurementMessage
  | DeviceCommandMessage
  | CommandResponseMessage
  | OTAProgressMessage
  | OTAStatusMessage;

// ==========================================
// 消息处理器类型
// ==========================================

export type MessageHandler = (message: Message) => void | Promise<void>;
export type MessageFilter = (message: Message) => boolean;

interface Subscription {
  id: string;
  channel: string;
  handler: MessageHandler;
  filter?: MessageFilter;
}

// ==========================================
// 消息总线接口
// ==========================================

export interface IMessageBus {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  publish(channel: string, message: Message): Promise<void>;
  subscribe(channel: string, handler: MessageHandler, filter?: MessageFilter): string;
  unsubscribe(subscriptionId: string): void;
  
  isHealthy(): boolean;
}

// ==========================================
// EventEmitter 实现（开发环境）
// ==========================================

export class EventEmitterMessageBus implements IMessageBus {
  private emitter: EventEmitter;
  private subscriptions: Map<string, Subscription>;
  private healthy: boolean;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // 增加监听器限制
    this.subscriptions = new Map();
    this.healthy = false;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing EventEmitter Message Bus...');
    this.healthy = true;
    logger.info('EventEmitter Message Bus initialized');
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down EventEmitter Message Bus...');
    this.emitter.removeAllListeners();
    this.subscriptions.clear();
    this.healthy = false;
    logger.info('EventEmitter Message Bus shutdown complete');
  }

  async publish(channel: string, message: Message): Promise<void> {
    if (!this.healthy) {
      throw new Error('Message bus not initialized');
    }

    logger.debug('Publishing message', { channel, type: message.type });
    this.emitter.emit(channel, message);
  }

  subscribe(channel: string, handler: MessageHandler, filter?: MessageFilter): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const wrappedHandler = async (message: Message) => {
      try {
        // 应用过滤器
        if (filter && !filter(message)) {
          return;
        }

        await handler(message);
      } catch (error) {
        logger.error('Message handler error', {
          subscriptionId,
          channel,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    this.emitter.on(channel, wrappedHandler);
    
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      channel,
      handler,
      filter,
    });

    logger.debug('Subscription created', { subscriptionId, channel });
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    this.emitter.removeListener(subscription.channel, subscription.handler as any);
    this.subscriptions.delete(subscriptionId);
    
    logger.debug('Subscription removed', { subscriptionId });
  }

  isHealthy(): boolean {
    return this.healthy;
  }
}

// ==========================================
// Redis Pub/Sub 实现（生产环境）
// ==========================================

export class RedisMessageBus implements IMessageBus {
  private publisher: Redis | null;
  private subscriber: Redis | null;
  private subscriptions: Map<string, Subscription>;
  private channelHandlers: Map<string, Set<string>>; // channel -> Set<subscriptionId>
  private healthy: boolean;

  constructor(
    private redisConfig: {
      host: string;
      port: number;
      password?: string;
      db?: number;
    }
  ) {
    this.publisher = null;
    this.subscriber = null;
    this.subscriptions = new Map();
    this.channelHandlers = new Map();
    this.healthy = false;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Redis Message Bus...', this.redisConfig);

    // 创建发布客户端
    this.publisher = new Redis({
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password,
      db: this.redisConfig.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // 创建订阅客户端
    this.subscriber = new Redis({
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      password: this.redisConfig.password,
      db: this.redisConfig.db || 0,
    });

    // 设置事件监听
    this.setupEventListeners();

    // 等待连接
    await Promise.all([
      new Promise((resolve) => this.publisher!.once('ready', resolve)),
      new Promise((resolve) => this.subscriber!.once('ready', resolve)),
    ]);

    this.healthy = true;
    logger.info('Redis Message Bus initialized');
  }

  private setupEventListeners(): void {
    if (!this.publisher || !this.subscriber) return;

    // 订阅客户端消息处理
    this.subscriber.on('message', (channel: string, messageStr: string) => {
      this.handleMessage(channel, messageStr);
    });

    // 错误处理
    this.publisher.on('error', (error) => {
      logger.error('Redis publisher error', { error: error.message });
      this.healthy = false;
    });

    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error', { error: error.message });
      this.healthy = false;
    });

    // 重连处理
    this.publisher.on('reconnecting', () => {
      logger.warn('Redis publisher reconnecting...');
    });

    this.subscriber.on('reconnecting', () => {
      logger.warn('Redis subscriber reconnecting...');
    });

    this.publisher.on('ready', () => {
      logger.info('Redis publisher ready');
      this.healthy = true;
    });

    this.subscriber.on('ready', () => {
      logger.info('Redis subscriber ready');
    });
  }

  private async handleMessage(channel: string, messageStr: string): Promise<void> {
    try {
      const message = JSON.parse(messageStr) as Message;
      
      // 转换时间戳
      message.timestamp = new Date(message.timestamp);

      const handlerIds = this.channelHandlers.get(channel);
      if (!handlerIds) return;

      // 调用所有订阅者
      for (const handlerId of handlerIds) {
        const subscription = this.subscriptions.get(handlerId);
        if (!subscription) continue;

        try {
          // 应用过滤器
          if (subscription.filter && !subscription.filter(message)) {
            continue;
          }

          await subscription.handler(message);
        } catch (error) {
          logger.error('Message handler error', {
            subscriptionId: handlerId,
            channel,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      logger.error('Failed to handle message', {
        channel,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async publish(channel: string, message: Message): Promise<void> {
    if (!this.healthy || !this.publisher) {
      throw new Error('Message bus not initialized');
    }

    const messageStr = JSON.stringify(message);
    await this.publisher.publish(channel, messageStr);
    
    logger.debug('Published message to Redis', { channel, type: message.type });
  }

  subscribe(channel: string, handler: MessageHandler, filter?: MessageFilter): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 记录订阅
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      channel,
      handler,
      filter,
    });

    // 更新通道处理器映射
    if (!this.channelHandlers.has(channel)) {
      this.channelHandlers.set(channel, new Set());
      
      // 首次订阅该通道，需要在 Redis 订阅
      if (this.subscriber) {
        this.subscriber.subscribe(channel);
        logger.debug('Subscribed to Redis channel', { channel });
      }
    }

    this.channelHandlers.get(channel)!.add(subscriptionId);
    logger.debug('Subscription created', { subscriptionId, channel });

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const { channel } = subscription;

    // 移除订阅
    this.subscriptions.delete(subscriptionId);

    // 更新通道处理器映射
    const handlers = this.channelHandlers.get(channel);
    if (handlers) {
      handlers.delete(subscriptionId);

      // 如果没有处理器了，取消 Redis 订阅
      if (handlers.size === 0) {
        this.channelHandlers.delete(channel);
        if (this.subscriber) {
          this.subscriber.unsubscribe(channel);
          logger.debug('Unsubscribed from Redis channel', { channel });
        }
      }
    }

    logger.debug('Subscription removed', { subscriptionId });
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Redis Message Bus...');

    if (this.subscriber) {
      await this.subscriber.quit();
    }

    if (this.publisher) {
      await this.publisher.quit();
    }

    this.subscriptions.clear();
    this.channelHandlers.clear();
    this.healthy = false;

    logger.info('Redis Message Bus shutdown complete');
  }

  isHealthy(): boolean {
    return this.healthy;
  }
}

// ==========================================
// 消息总线工厂
// ==========================================

export class MessageBusFactory {
  static create(): IMessageBus {
    const env = process.env.NODE_ENV || 'development';
    const messageBusType = process.env.MESSAGE_BUS_TYPE || (env === 'production' ? 'redis' : 'memory');

    logger.info('Creating message bus', { type: messageBusType, env });

    if (messageBusType === 'redis') {
      const redisConfig = configManager.get('redis') || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
      };

      return new RedisMessageBus(redisConfig);
    }

    return new EventEmitterMessageBus();
  }
}

// ==========================================
// 全局消息总线实例
// ==========================================

export const messageBus = MessageBusFactory.create();

// ==========================================
// 预定义通道常量
// ==========================================

export const Channels = {
  // 设备数据
  TELEMETRY: 'device:telemetry',
  STATUS: 'device:status',
  EVENTS: 'device:events',
  MEASUREMENTS: 'device:measurements',
  
  // 设备控制
  COMMANDS: 'device:commands',
  COMMAND_RESPONSES: 'device:command-responses',
  
  // OTA
  OTA_PROGRESS: 'ota:progress',
  OTA_STATUS: 'ota:status',
  
  // 系统
  SYSTEM_EVENTS: 'system:events',
  
  // 租户级通道（动态生成）
  tenantChannel: (tenantId: string, channel: string) => `tenant:${tenantId}:${channel}`,
  deviceChannel: (deviceId: string, channel: string) => `device:${deviceId}:${channel}`,
} as const;

