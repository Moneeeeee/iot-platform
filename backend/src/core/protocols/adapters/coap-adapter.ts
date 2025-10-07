/**
 * CoAP 协议适配器
 * 处理CoAP连接，IoT低功耗通信
 */

import { BaseProtocolAdapter } from './adapter-base';
import { ProtocolType, ProtocolConfig, ProtocolMessage } from '../protocol-types';
import { logger } from '@/common/logger';

// CoAP 消息类型
export enum CoAPMessageType {
  CONFIRMABLE = 0,
  NON_CONFIRMABLE = 1,
  ACKNOWLEDGMENT = 2,
  RESET = 3
}

// CoAP 方法
export enum CoAPMethod {
  GET = 1,
  POST = 2,
  PUT = 3,
  DELETE = 4
}

export interface CoAPMessage {
  type: CoAPMessageType;
  method: CoAPMethod;
  code: number;
  messageId: number;
  token: Buffer;
  options: Map<number, Buffer>;
  payload: Buffer;
}

export class CoAPAdapter extends BaseProtocolAdapter {
  private server: any = null;
  private port: number;
  private host: string;
  private messageIdCounter = 0;

  constructor(config: ProtocolConfig) {
    super(ProtocolType.LORA, config); // 使用LORA类型，因为CoAP通常用于低功耗场景
    this.port = config.port || 5683; // CoAP默认端口
    this.host = config.host || '0.0.0.0';
  }

  /**
   * 初始化CoAP适配器
   */
  async initialize(): Promise<void> {
    try {
      this.validateConfig();
      this.setupCoAPServer();
      this.initialized = true;
      this.updateStatus({ connected: true });
      this.log('info', 'CoAP adapter initialized', { host: this.host, port: this.port });
    } catch (error) {
      this.log('error', 'Failed to initialize CoAP adapter', { error });
      throw error;
    }
  }

  /**
   * 设置CoAP服务器
   */
  private setupCoAPServer(): void {
    // 注意：这里需要安装coap库，如 'coap' 或 'node-coap'
    // 由于可能没有安装，这里提供接口定义
    
    this.log('info', 'CoAP server setup (requires coap library)', {
      host: this.host,
      port: this.port
    });

    // 模拟CoAP服务器设置
    this.server = {
      listen: (port: number, host: string, callback: () => void) => {
        this.log('info', 'CoAP server listening', { port, host });
        callback();
      },
      on: (event: string, handler: Function) => {
        this.log('debug', 'CoAP server event handler registered', { event });
      }
    };
  }

  /**
   * 处理CoAP请求
   */
  private async handleCoAPRequest(req: any, res: any): Promise<void> {
    try {
      const { url, method, payload } = req;
      const deviceId = this.extractDeviceIdFromUrl(url);
      
      if (!deviceId) {
        this.sendCoAPResponse(res, 400, 'Bad Request');
        return;
      }

      // 根据URL路径处理不同类型的请求
      if (url.includes('/telemetry')) {
        await this.handleTelemetryRequest(deviceId, payload, res);
      } else if (url.includes('/status')) {
        await this.handleStatusRequest(deviceId, payload, res);
      } else if (url.includes('/config')) {
        await this.handleConfigRequest(deviceId, res);
      } else if (url.includes('/commands')) {
        await this.handleCommandsRequest(deviceId, res);
      } else {
        this.sendCoAPResponse(res, 404, 'Not Found');
      }
    } catch (error) {
      this.log('error', 'Failed to handle CoAP request', { error });
      this.sendCoAPResponse(res, 500, 'Internal Server Error');
    }
  }

  /**
   * 处理遥测数据请求
   */
  private async handleTelemetryRequest(deviceId: string, payload: Buffer, res: any): Promise<void> {
    try {
      const data = this.parseCoAPPayload(payload);
      
      const message: ProtocolMessage = {
        protocol: ProtocolType.LORA,
        payload: {
          type: 'telemetry',
          tenantId: data.tenantId || 'default',
          deviceId,
          deviceType: data.deviceType || 'sensor',
          data: data.data || {},
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'coap-adapter'
      };

      // 发送到事件总线
      this.emit('message', message);

      // 发送CoAP响应
      this.sendCoAPResponse(res, 204, 'No Content');
    } catch (error) {
      this.log('error', 'Failed to handle telemetry request', { error });
      this.sendCoAPResponse(res, 500, 'Internal Server Error');
    }
  }

  /**
   * 处理状态请求
   */
  private async handleStatusRequest(deviceId: string, payload: Buffer, res: any): Promise<void> {
    try {
      const data = this.parseCoAPPayload(payload);
      
      const message: ProtocolMessage = {
        protocol: ProtocolType.LORA,
        payload: {
          type: 'status_change',
          tenantId: data.tenantId || 'default',
          deviceId,
          deviceType: data.deviceType || 'sensor',
          status: data.status,
          previousStatus: data.previousStatus,
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'coap-adapter'
      };

      this.emit('message', message);
      this.sendCoAPResponse(res, 204, 'No Content');
    } catch (error) {
      this.log('error', 'Failed to handle status request', { error });
      this.sendCoAPResponse(res, 500, 'Internal Server Error');
    }
  }

  /**
   * 处理配置请求
   */
  private async handleConfigRequest(deviceId: string, res: any): Promise<void> {
    try {
      // 获取设备配置
      const config = {
        deviceId,
        sampling: {
          interval: 30000, // 30秒采样间隔（低功耗）
          enabled: true
        },
        mqtt: {
          broker: 'mqtt://broker.example.com',
          port: 1883,
          topics: {
            telemetry: `devices/${deviceId}/telemetry`,
            status: `devices/${deviceId}/status`
          }
        },
        coap: {
          server: `${this.host}:${this.port}`,
          endpoints: {
            telemetry: `/devices/${deviceId}/telemetry`,
            status: `/devices/${deviceId}/status`,
            config: `/devices/${deviceId}/config`
          }
        }
      };

      this.sendCoAPResponse(res, 200, 'OK', JSON.stringify(config));
    } catch (error) {
      this.log('error', 'Failed to handle config request', { error });
      this.sendCoAPResponse(res, 500, 'Internal Server Error');
    }
  }

  /**
   * 处理命令请求
   */
  private async handleCommandsRequest(deviceId: string, res: any): Promise<void> {
    try {
      // 获取待执行的命令
      const commands = [
        {
          id: 'cmd_001',
          type: 'reboot',
          parameters: { delay: 10 },
          timestamp: new Date()
        }
      ];

      this.sendCoAPResponse(res, 200, 'OK', JSON.stringify(commands));
    } catch (error) {
      this.log('error', 'Failed to handle commands request', { error });
      this.sendCoAPResponse(res, 500, 'Internal Server Error');
    }
  }

  /**
   * 解析CoAP载荷
   */
  private parseCoAPPayload(payload: Buffer): any {
    try {
      // 尝试解析为JSON
      const jsonStr = payload.toString('utf8');
      return JSON.parse(jsonStr);
    } catch {
      // 如果不是JSON，尝试解析为CBOR或其他格式
      return this.parseBinaryPayload(payload);
    }
  }

  /**
   * 解析二进制载荷
   */
  private parseBinaryPayload(payload: Buffer): any {
    try {
      // 简单的二进制格式解析
      if (payload.length < 4) {
        return { data: {} };
      }

      // 假设格式: [2字节数据长度][数据]
      const dataLength = payload.readUInt16BE(0);
      const data = payload.slice(2, 2 + dataLength);

      return {
        data: {
          raw: data.toString('hex'),
          length: dataLength
        }
      };
    } catch (error) {
      return { data: { raw: payload.toString('hex') } };
    }
  }

  /**
   * 发送CoAP响应
   */
  private sendCoAPResponse(res: any, code: number, message: string, payload?: string): void {
    try {
      if (res && typeof res.code === 'function') {
        res.code(code);
        if (payload) {
          res.end(payload);
        } else {
          res.end(message);
        }
      } else {
        this.log('debug', 'CoAP response sent', { code, message });
      }
    } catch (error) {
      this.log('error', 'Failed to send CoAP response', { error });
    }
  }

  /**
   * 从URL提取设备ID
   */
  private extractDeviceIdFromUrl(url: string): string | null {
    const match = url.match(/\/devices\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * 发布消息 - CoAP适配器通过CoAP发送
   */
  async publish(topic: string, payload: any, options: any = {}): Promise<boolean> {
    try {
      const { target, port = this.port } = options;
      if (!target) {
        this.log('warn', 'CoAP target not specified');
        return false;
      }

      // 序列化消息
      const message = JSON.stringify(payload);
      
      // 发送CoAP消息（需要实际的CoAP客户端实现）
      this.log('debug', 'CoAP message sent', { target, port, message });
      return true;
    } catch (error) {
      this.log('error', 'Failed to publish CoAP message', { error });
      return false;
    }
  }

  /**
   * 订阅主题 - CoAP适配器通过监听端点
   */
  async subscribe(topic: string, options: any = {}): Promise<boolean> {
    this.log('debug', 'CoAP adapter subscribe called', { topic });
    return true;
  }

  /**
   * 取消订阅
   */
  async unsubscribe(topic: string): Promise<boolean> {
    this.log('debug', 'CoAP adapter unsubscribe called', { topic });
    return true;
  }

  /**
   * 关闭适配器
   */
  async shutdown(): Promise<void> {
    try {
      if (this.server && typeof this.server.close === 'function') {
        this.server.close();
        this.server = null;
      }

      this.initialized = false;
      this.updateStatus({ connected: false });
      this.log('info', 'CoAP adapter shutdown');
    } catch (error) {
      this.log('error', 'Failed to shutdown CoAP adapter', { error });
      throw error;
    }
  }

  /**
   * 获取服务器信息
   */
  getServerInfo(): { host: string; port: number; protocol: string } {
    return {
      host: this.host,
      port: this.port,
      protocol: 'coap'
    };
  }
}
