/**
 * UDP服务
 * 处理UDP协议通信和设备消息管理
 */

import dgram from 'dgram';
import { EventEmitter } from 'events';
import { logger } from '../common/logger';
import { ProtocolType } from '../common/types';

/**
 * UDP服务类
 */
export class UDPService extends EventEmitter {
  private server: dgram.Socket | null = null;
  private isListening = false;
  private port: number;
  private host: string;

  constructor() {
    super();
    this.port = parseInt(process.env.UDP_PORT || '8888', 10);
    this.host = process.env.UDP_HOST || '0.0.0.0';
  }

  /**
   * 初始化UDP服务
   */
  public async initialize(): Promise<void> {
    try {
      // 创建UDP服务器
      this.server = dgram.createSocket('udp4');

      // 设置事件监听器
      this.setupEventListeners();

      // 开始监听
      await this.startListening();

      logger.info('UDP service initialized', { 
        host: this.host, 
        port: this.port 
      });

    } catch (error) {
      logger.error('Failed to initialize UDP service:', error);
      throw error;
    }
  }

  /**
   * 设置UDP事件监听器
   */
  private setupEventListeners(): void {
    if (!this.server) return;

    // 消息接收事件
    this.server.on('message', (msg, rinfo) => {
      this.handleMessage(msg, rinfo);
    });

    // 错误事件
    this.server.on('error', (error) => {
      logger.error('UDP server error:', error);
      this.emit('error', error);
    });

    // 监听开始事件
    this.server.on('listening', () => {
      this.isListening = true;
      const address = this.server!.address();
      logger.info('UDP server listening', { 
        address: address.address, 
        port: address.port 
      });
      this.emit('listening');
    });

    // 关闭事件
    this.server.on('close', () => {
      this.isListening = false;
      logger.info('UDP server closed');
      this.emit('closed');
    });
  }

  /**
   * 开始监听UDP端口
   */
  private async startListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        reject(new Error('UDP server not initialized'));
        return;
      }

      this.server.bind(this.port, this.host, () => {
        logger.info(`UDP server listening on ${this.host}:${this.port}`);
        resolve();
      });
      
      this.server.on('error', (error) => {
        logger.error('UDP server error:', error);
        reject(error);
      });
    });
  }

  /**
   * 处理接收到的UDP消息
   * @param msg 消息缓冲区
   * @param rinfo 远程信息
   */
  private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      // 尝试解析JSON消息
      const message = JSON.parse(msg.toString());
      
      logger.debug('UDP message received', {
        from: `${rinfo.address}:${rinfo.port}`,
        size: msg.length,
        deviceId: message.deviceId,
      });

      // 验证消息格式
      if (!message.deviceId) {
        logger.warn('UDP message missing deviceId', { message });
        return;
      }

      // 根据消息类型处理
      switch (message.type) {
        case 'data':
          this.handleDeviceData(message.deviceId, message.data, rinfo);
          break;
        case 'status':
          this.handleDeviceStatus(message.deviceId, message.status, rinfo);
          break;
        case 'heartbeat':
          this.handleHeartbeat(message.deviceId, message.heartbeat, rinfo);
          break;
        case 'alert':
          this.handleDeviceAlert(message.deviceId, message.alert, rinfo);
          break;
        default:
          logger.warn('Unknown UDP message type:', message.type);
      }

    } catch (error) {
      // 如果不是JSON格式，尝试其他解析方式
      logger.debug('UDP message is not JSON, trying other formats', {
        from: `${rinfo.address}:${rinfo.port}`,
        size: msg.length,
        error: error.message,
      });

      // 可以在这里添加其他消息格式的解析逻辑
      this.handleRawMessage(msg, rinfo);
    }
  }

  /**
   * 处理原始消息（非JSON格式）
   * @param msg 消息缓冲区
   * @param rinfo 远程信息
   */
  private handleRawMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    // 这里可以实现自定义的二进制协议解析
    // 例如：固定长度的包头 + 数据
    
    logger.debug('Raw UDP message received', {
      from: `${rinfo.address}:${rinfo.port}`,
      size: msg.length,
      data: msg.toString('hex').substring(0, 100), // 只显示前50个字节的十六进制
    });

    // 触发原始消息事件
    this.emit('rawMessage', {
      data: msg,
      remoteInfo: rinfo,
      timestamp: new Date(),
    });
  }

  /**
   * 处理设备数据消息
   * @param deviceId 设备ID
   * @param data 数据
   * @param rinfo 远程信息
   */
  private handleDeviceData(deviceId: string, data: any, rinfo: dgram.RemoteInfo): void {
        logger.info('Device data received via UDP', { deviceId, data });
    
    // 触发设备数据事件
    this.emit('deviceData', {
      deviceId,
      data,
      protocol: ProtocolType.UDP,
      source: `${rinfo.address}:${rinfo.port}`,
      timestamp: new Date(),
    });
  }

  /**
   * 处理设备状态消息
   * @param deviceId 设备ID
   * @param status 状态
   * @param rinfo 远程信息
   */
  private handleDeviceStatus(deviceId: string, status: any, rinfo: dgram.RemoteInfo): void {
    logger.info('Device status update via UDP', { 
      deviceId, 
      status,
      from: `${rinfo.address}:${rinfo.port}`,
    });
    
    // 触发设备状态事件
    this.emit('deviceStatus', {
      deviceId,
      status,
      source: `${rinfo.address}:${rinfo.port}`,
      timestamp: new Date(),
    });
  }

  /**
   * 处理心跳消息
   * @param deviceId 设备ID
   * @param heartbeat 心跳信息
   * @param rinfo 远程信息
   */
  private handleHeartbeat(deviceId: string, heartbeat: any, rinfo: dgram.RemoteInfo): void {
    logger.debug('Device heartbeat via UDP', { 
      deviceId, 
      heartbeat,
      from: `${rinfo.address}:${rinfo.port}`,
    });
    
    // 触发心跳事件
    this.emit('heartbeat', {
      deviceId,
      heartbeat,
      source: `${rinfo.address}:${rinfo.port}`,
      timestamp: new Date(),
    });
  }

  /**
   * 处理设备告警消息
   * @param deviceId 设备ID
   * @param alert 告警信息
   * @param rinfo 远程信息
   */
  private handleDeviceAlert(deviceId: string, alert: any, rinfo: dgram.RemoteInfo): void {
    logger.alert(alert.id || 'unknown', deviceId, alert.level, alert.message);
    
    // 触发设备告警事件
    this.emit('deviceAlert', {
      deviceId,
      alert,
      source: `${rinfo.address}:${rinfo.port}`,
      timestamp: new Date(),
    });
  }

  /**
   * 发送UDP消息
   * @param address 目标地址
   * @param port 目标端口
   * @param message 消息
   */
  public sendMessage(address: string, port: number, message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server || !this.isListening) {
        reject(new Error('UDP server not listening'));
        return;
      }

      const buffer = Buffer.from(JSON.stringify(message));
      
      this.server!.send(buffer, port, address, (error) => {
        if (error) {
          logger.error('Failed to send UDP message:', { 
            address, 
            port, 
            error 
          });
          reject(error);
        } else {
          logger.debug('UDP message sent', { 
            address, 
            port, 
            size: buffer.length 
          });
          resolve();
        }
      });
    });
  }

  /**
   * 向设备发送控制命令
   * @param deviceId 设备ID
   * @param address 设备地址
   * @param port 设备端口
   * @param command 命令
   * @param parameters 参数
   */
  public async sendDeviceCommand(
    deviceId: string, 
    address: string, 
    port: number, 
    command: string, 
    parameters?: any
  ): Promise<void> {
    const message = {
      type: 'control',
      deviceId,
      command,
      parameters,
      timestamp: new Date().toISOString(),
      source: 'gateway',
    };

    await this.sendMessage(address, port, message);
    
    logger.info('Device command sent via UDP', { 
      deviceId, 
      address, 
      port, 
      command, 
      parameters 
    });
  }

  /**
   * 获取服务状态
   */
  public getStatus(): any {
    return {
      isListening: this.isListening,
      host: this.host,
      port: this.port,
      address: this.server?.address(),
    };
  }

  /**
   * 关闭UDP服务
   */
  public async close(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.server = null;
          this.isListening = false;
          logger.info('UDP service closed');
          resolve();
        });
      });
    }
  }
}

// 导出单例实例
export const udpService = new UDPService();
