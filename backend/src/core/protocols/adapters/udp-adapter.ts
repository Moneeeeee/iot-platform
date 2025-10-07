/**
 * UDP 协议适配器
 * 处理UDP连接，收发二进制传感数据
 */

import { BaseProtocolAdapter } from './adapter-base';
import { ProtocolType, ProtocolConfig, ProtocolMessage } from '../protocol-types';
import { createSocket, Socket as UDPSocket } from 'dgram';
import { logger } from '@/common/logger';

export class UDPAdapter extends BaseProtocolAdapter {
  private server: UDPSocket | null = null;
  private port: number;
  private host: string;

  constructor(config: ProtocolConfig) {
    super(ProtocolType.UDP, config);
    this.port = config.port || 8888;
    this.host = config.host || '0.0.0.0';
  }

  /**
   * 初始化UDP适配器
   */
  async initialize(): Promise<void> {
    try {
      this.validateConfig();
      this.setupUDPServer();
      this.initialized = true;
      this.updateStatus({ connected: true });
      this.log('info', 'UDP adapter initialized', { host: this.host, port: this.port });
    } catch (error) {
      this.log('error', 'Failed to initialize UDP adapter', { error });
      throw error;
    }
  }

  /**
   * 设置UDP服务器
   */
  private setupUDPServer(): void {
    this.server = createSocket('udp4');

    this.server.on('message', (msg: Buffer, rinfo: any) => {
      this.handleUDPMessage(msg, rinfo);
    });

    this.server.on('error', (error: Error) => {
      this.log('error', 'UDP server error', { error: error.message });
      this.updateStatus({ error: error.message });
      
      // 如果是端口冲突，尝试使用其他端口
      if (error.message.includes('EADDRINUSE')) {
        this.log('warn', 'Port in use, trying alternative port', { 
          originalPort: this.port,
          newPort: this.port + 1 
        });
        this.port += 1;
        this.retryBind();
      }
    });

    this.server.on('listening', () => {
      const address = this.server?.address();
      this.log('info', 'UDP server listening', { address });
    });

    // 绑定端口
    this.bindPort();
  }

  /**
   * 绑定端口
   */
  private bindPort(): void {
    try {
      this.server?.bind(this.port, this.host);
    } catch (error) {
      this.log('error', 'Failed to bind UDP port', { error, port: this.port });
      this.updateStatus({ error: `Failed to bind port ${this.port}` });
    }
  }

  /**
   * 重试绑定端口
   */
  private retryBind(): void {
    if (this.port > 65535) {
      this.log('error', 'No available ports found');
      this.updateStatus({ error: 'No available ports found' });
      return;
    }
    
    // 关闭当前服务器
    if (this.server) {
      this.server.close();
    }
    
    // 重新创建服务器
    this.setupUDPServer();
  }

  /**
   * 处理UDP消息
   */
  private async handleUDPMessage(msg: Buffer, rinfo: any): Promise<void> {
    try {
      // 解析二进制数据
      const messageData = this.parseBinaryMessage(msg);
      
      if (!messageData) {
        this.log('warn', 'Failed to parse UDP message', { 
          size: msg.length, 
          from: `${rinfo.address}:${rinfo.port}` 
        });
        return;
      }

      const { deviceId, deviceType, tenantId, messageType, data } = messageData;

      const message: ProtocolMessage = {
        protocol: ProtocolType.UDP,
        payload: {
          type: messageType || 'telemetry',
          tenantId,
          deviceId,
          deviceType,
          data,
          timestamp: new Date(),
          source: `${rinfo.address}:${rinfo.port}`
        },
        timestamp: new Date(),
        source: 'udp-adapter'
      };

      // 发送到事件总线
      this.emit('message', message);

      this.log('debug', 'UDP message processed', {
        deviceId,
        messageType,
        from: `${rinfo.address}:${rinfo.port}`
      });
    } catch (error) {
      this.log('error', 'Failed to handle UDP message', { error });
    }
  }

  /**
   * 解析二进制消息
   * 支持多种二进制格式
   */
  private parseBinaryMessage(buffer: Buffer): any {
    try {
      // 尝试解析为JSON
      const jsonStr = buffer.toString('utf8');
      const jsonData = JSON.parse(jsonStr);
      return jsonData;
    } catch {
      // 如果不是JSON，尝试解析为自定义二进制格式
      return this.parseCustomBinaryFormat(buffer);
    }
  }

  /**
   * 解析自定义二进制格式
   * 格式: [4字节设备ID][4字节消息类型][4字节数据长度][数据]
   */
  private parseCustomBinaryFormat(buffer: Buffer): any {
    try {
      if (buffer.length < 12) {
        return null;
      }

      let offset = 0;
      
      // 读取设备ID (4字节)
      const deviceId = buffer.readUInt32BE(offset);
      offset += 4;
      
      // 读取消息类型 (4字节)
      const messageType = buffer.readUInt32BE(offset);
      offset += 4;
      
      // 读取数据长度 (4字节)
      const dataLength = buffer.readUInt32BE(offset);
      offset += 4;
      
      // 读取数据
      const data = buffer.slice(offset, offset + dataLength);
      
      // 转换消息类型
      const messageTypeMap: Record<number, string> = {
        1: 'telemetry',
        2: 'status',
        3: 'event',
        4: 'ota_progress'
      };

      return {
        deviceId: deviceId.toString(),
        deviceType: 'sensor', // 默认类型
        tenantId: 'default', // 默认租户
        messageType: messageTypeMap[messageType] || 'telemetry',
        data: this.parseSensorData(data)
      };
    } catch (error) {
      this.log('error', 'Failed to parse custom binary format', { error });
      return null;
    }
  }

  /**
   * 解析传感器数据
   */
  private parseSensorData(data: Buffer): any {
    try {
      // 假设传感器数据格式: [4字节温度][4字节湿度][4字节压力]
      if (data.length >= 12) {
        return {
          temperature: data.readFloatBE(0),
          humidity: data.readFloatBE(4),
          pressure: data.readFloatBE(8)
        };
      }
      
      // 如果数据长度不够，返回原始数据
      return { raw: data.toString('hex') };
    } catch (error) {
      return { raw: data.toString('hex') };
    }
  }

  /**
   * 发布消息 - UDP适配器通过UDP发送
   */
  async publish(topic: string, payload: any, options: any = {}): Promise<boolean> {
    try {
      if (!this.server) {
        this.log('warn', 'UDP server not initialized');
        return false;
      }

      const { target, port = this.port } = options;
      if (!target) {
        this.log('warn', 'UDP target not specified');
        return false;
      }

      // 序列化消息
      const message = this.serializeMessage(payload);
      
      // 发送UDP消息
      this.server.send(message, port, target, (error) => {
        if (error) {
          this.log('error', 'Failed to send UDP message', { error, target, port });
        } else {
          this.log('debug', 'UDP message sent', { target, port });
        }
      });

      return true;
    } catch (error) {
      this.log('error', 'Failed to publish UDP message', { error });
      return false;
    }
  }

  /**
   * 序列化消息
   */
  private serializeMessage(payload: any): Buffer {
    try {
      // 优先使用JSON格式
      const jsonStr = JSON.stringify(payload);
      return Buffer.from(jsonStr, 'utf8');
    } catch (error) {
      // 如果JSON序列化失败，使用二进制格式
      return this.serializeBinaryMessage(payload);
    }
  }

  /**
   * 序列化二进制消息
   */
  private serializeBinaryMessage(payload: any): Buffer {
    const buffer = Buffer.alloc(1024); // 预分配缓冲区
    let offset = 0;

    try {
      // 写入设备ID
      buffer.writeUInt32BE(parseInt(payload.deviceId) || 0, offset);
      offset += 4;

      // 写入消息类型
      const messageTypeMap: Record<string, number> = {
        'telemetry': 1,
        'status': 2,
        'event': 3,
        'ota_progress': 4
      };
      buffer.writeUInt32BE(messageTypeMap[payload.type] || 1, offset);
      offset += 4;

      // 写入数据
      const dataStr = JSON.stringify(payload.data || {});
      const dataBuffer = Buffer.from(dataStr, 'utf8');
      buffer.writeUInt32BE(dataBuffer.length, offset);
      offset += 4;
      dataBuffer.copy(buffer, offset);

      return buffer.slice(0, offset + dataBuffer.length);
    } catch (error) {
      this.log('error', 'Failed to serialize binary message', { error });
      return Buffer.from(JSON.stringify(payload), 'utf8');
    }
  }

  /**
   * 订阅主题 - UDP适配器通过监听端口
   */
  async subscribe(topic: string, options: any = {}): Promise<boolean> {
    this.log('debug', 'UDP adapter subscribe called', { topic });
    return true;
  }

  /**
   * 取消订阅
   */
  async unsubscribe(topic: string): Promise<boolean> {
    this.log('debug', 'UDP adapter unsubscribe called', { topic });
    return true;
  }

  /**
   * 关闭适配器
   */
  async shutdown(): Promise<void> {
    try {
      if (this.server) {
        this.server.close();
        this.server = null;
      }

      this.initialized = false;
      this.updateStatus({ connected: false });
      this.log('info', 'UDP adapter shutdown');
    } catch (error) {
      this.log('error', 'Failed to shutdown UDP adapter', { error });
      throw error;
    }
  }

  /**
   * 获取服务器信息
   */
  getServerInfo(): { host: string; port: number; address?: any; connected: boolean } {
    try {
      const address = this.server?.address();
      return {
        host: this.host,
        port: this.port,
        address: address,
        connected: this.initialized && this.server !== null
      };
    } catch (error) {
      // 如果获取地址失败，返回基本信息
      this.log('warn', 'Failed to get server address', { error: error.message });
      return {
        host: this.host,
        port: this.port,
        address: null,
        connected: this.initialized && this.server !== null
      };
    }
  }
}
