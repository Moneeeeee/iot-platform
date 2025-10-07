/**
 * 协议适配器基类
 * 定义所有协议适配器的通用接口和基础功能
 */

import { EventEmitter } from 'events';
import { ProtocolType, ProtocolConfig, AdapterStatus, ProtocolMessage } from '../protocol-types';
import { logger } from '@/common/logger';

export abstract class BaseProtocolAdapter extends EventEmitter {
  protected config: ProtocolConfig;
  protected _status: AdapterStatus;
  protected initialized = false;

  constructor(public readonly protocol: ProtocolType, config: ProtocolConfig) {
    super();
    this.config = config;
    this._status = {
      connected: false,
      reconnectAttempts: 0
    };
  }

  /**
   * 获取适配器状态
   */
  get status(): AdapterStatus {
    return { ...this._status };
  }

  /**
   * 初始化适配器 - 子类必须实现
   */
  abstract initialize(): Promise<void>;

  /**
   * 发布消息 - 子类必须实现
   */
  abstract publish(topic: string, payload: any, options?: any): Promise<boolean>;

  /**
   * 订阅主题 - 子类必须实现
   */
  abstract subscribe(topic: string, options?: any): Promise<boolean>;

  /**
   * 取消订阅 - 子类必须实现
   */
  abstract unsubscribe(topic: string): Promise<boolean>;

  /**
   * 关闭适配器 - 子类必须实现
   */
  abstract shutdown(): Promise<void>;

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this._status.connected;
  }

  /**
   * 更新连接状态
   */
  protected updateStatus(updates: Partial<AdapterStatus>): void {
    this._status = { ...this._status, ...updates };
    
    if (updates.connected !== undefined) {
      if (updates.connected) {
        this._status.lastConnected = new Date();
        this._status.reconnectAttempts = 0;
        this._status.error = undefined;
        this.emit('connected');
        this.log('info', 'Adapter connected');
      } else {
        this.emit('disconnected');
        this.log('warn', 'Adapter disconnected');
      }
    }

    if (updates.error) {
      this.emit('error', new Error(updates.error));
      this.log('error', 'Adapter error', { error: updates.error });
    }
  }

  /**
   * 增加重连尝试次数
   */
  protected incrementReconnectAttempts(): void {
    this._status.reconnectAttempts++;
    this.log('warn', `Reconnect attempt ${this._status.reconnectAttempts}`);
  }

  /**
   * 重置重连尝试次数
   */
  protected resetReconnectAttempts(): void {
    this._status.reconnectAttempts = 0;
  }

  /**
   * 记录日志
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logData = {
      protocol: this.protocol,
      ...data
    };

    switch (level) {
      case 'debug':
        logger.debug(message, logData);
        break;
      case 'info':
        logger.info(message, logData);
        break;
      case 'warn':
        logger.warn(message, logData);
        break;
      case 'error':
        logger.error(message, logData);
        break;
    }
  }

  /**
   * 创建协议消息对象
   */
  protected createProtocolMessage(
    topic: string,
    payload: any,
    options: { qos?: number; retain?: boolean } = {}
  ): ProtocolMessage {
    return {
      protocol: this.protocol,
      topic,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      qos: options.qos,
      retain: options.retain,
      timestamp: new Date(),
      source: `${this.protocol}-adapter`
    };
  }

  /**
   * 验证配置
   */
  protected validateConfig(): void {
    if (!this.config.enabled) {
      throw new Error(`${this.protocol} adapter is disabled`);
    }
  }

  /**
   * 获取配置值
   */
  protected getConfigValue<T>(key: string, defaultValue?: T): T {
    return (this.config[key] as T) ?? defaultValue;
  }
}
