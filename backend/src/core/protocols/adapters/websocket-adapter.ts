/**
 * WebSocket 协议适配器
 * 处理WebSocket连接，推送给前端
 */

import { BaseProtocolAdapter } from './adapter-base';
import { ProtocolType, ProtocolConfig, ProtocolMessage } from '../protocol-types';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '@/common/logger';

export class WebSocketAdapter extends BaseProtocolAdapter {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, Socket> = new Map();

  constructor(config: ProtocolConfig, io?: SocketIOServer) {
    super(ProtocolType.WEBSOCKET, config);
    this.io = io;
  }

  /**
   * 初始化WebSocket适配器
   */
  async initialize(): Promise<void> {
    try {
      this.validateConfig();
      
      if (!this.io) {
        throw new Error('Socket.IO instance not provided');
      }

      this.setupSocketHandlers();
      this.initialized = true;
      this.updateStatus({ connected: true });
      this.log('info', 'WebSocket adapter initialized');
    } catch (error) {
      this.log('error', 'Failed to initialize WebSocket adapter', { error });
      throw error;
    }
  }

  /**
   * 设置Socket处理器
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.log('info', 'WebSocket client connected', { clientId: socket.id });
      this.connectedClients.set(socket.id, socket);

      // 处理设备消息
      socket.on('device.message', (data: any) => {
        this.handleDeviceMessage(socket, data);
      });

      // 处理设备状态
      socket.on('device.status', (data: any) => {
        this.handleDeviceStatus(socket, data);
      });

      // 处理设备事件
      socket.on('device.event', (data: any) => {
        this.handleDeviceEvent(socket, data);
      });

      // 处理OTA进度
      socket.on('device.ota.progress', (data: any) => {
        this.handleOTAProgress(socket, data);
      });

      // 处理客户端断开连接
      socket.on('disconnect', () => {
        this.log('info', 'WebSocket client disconnected', { clientId: socket.id });
        this.connectedClients.delete(socket.id);
      });

      // 处理错误
      socket.on('error', (error) => {
        this.log('error', 'WebSocket client error', { clientId: socket.id, error });
      });
    });
  }

  /**
   * 处理设备消息
   */
  private async handleDeviceMessage(socket: Socket, data: any): Promise<void> {
    try {
      const { tenantId, deviceId, deviceType, messageType, payload } = data;

      const message: ProtocolMessage = {
        protocol: ProtocolType.WEBSOCKET,
        payload: {
          type: messageType || 'telemetry',
          tenantId,
          deviceId,
          deviceType,
          data: payload,
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'websocket-adapter'
      };

      // 发送到事件总线
      this.emit('message', message);

      // 确认收到消息
      socket.emit('message.ack', { success: true, timestamp: new Date() });
    } catch (error) {
      this.log('error', 'Failed to handle device message', { error });
      socket.emit('message.ack', { success: false, error: 'Failed to process message' });
    }
  }

  /**
   * 处理设备状态
   */
  private async handleDeviceStatus(socket: Socket, data: any): Promise<void> {
    try {
      const { tenantId, deviceId, deviceType, status, previousStatus } = data;

      const message: ProtocolMessage = {
        protocol: ProtocolType.WEBSOCKET,
        payload: {
          type: 'status_change',
          tenantId,
          deviceId,
          deviceType,
          status,
          previousStatus,
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'websocket-adapter'
      };

      this.emit('message', message);
      socket.emit('status.ack', { success: true, timestamp: new Date() });
    } catch (error) {
      this.log('error', 'Failed to handle device status', { error });
      socket.emit('status.ack', { success: false, error: 'Failed to process status' });
    }
  }

  /**
   * 处理设备事件
   */
  private async handleDeviceEvent(socket: Socket, data: any): Promise<void> {
    try {
      const { tenantId, deviceId, deviceType, eventType, description, severity, eventData } = data;

      const message: ProtocolMessage = {
        protocol: ProtocolType.WEBSOCKET,
        payload: {
          type: 'device_event',
          tenantId,
          deviceId,
          deviceType,
          eventType,
          description,
          severity,
          data: eventData,
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'websocket-adapter'
      };

      this.emit('message', message);
      socket.emit('event.ack', { success: true, timestamp: new Date() });
    } catch (error) {
      this.log('error', 'Failed to handle device event', { error });
      socket.emit('event.ack', { success: false, error: 'Failed to process event' });
    }
  }

  /**
   * 处理OTA进度
   */
  private async handleOTAProgress(socket: Socket, data: any): Promise<void> {
    try {
      const { tenantId, deviceId, deviceType, progress, status, message } = data;

      const protocolMessage: ProtocolMessage = {
        protocol: ProtocolType.WEBSOCKET,
        payload: {
          type: 'ota_progress',
          tenantId,
          deviceId,
          deviceType,
          progress,
          status,
          message,
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'websocket-adapter'
      };

      this.emit('message', protocolMessage);
      socket.emit('ota.ack', { success: true, timestamp: new Date() });
    } catch (error) {
      this.log('error', 'Failed to handle OTA progress', { error });
      socket.emit('ota.ack', { success: false, error: 'Failed to process OTA progress' });
    }
  }

  /**
   * 发布消息 - 推送给前端
   */
  async publish(topic: string, payload: any, options: any = {}): Promise<boolean> {
    try {
      if (!this.io) {
        this.log('warn', 'Socket.IO instance not available');
        return false;
      }

      const { target, event = 'device.data' } = options;

      if (target) {
        // 发送给特定客户端
        const socket = this.connectedClients.get(target);
        if (socket) {
          socket.emit(event, payload);
          this.log('debug', 'Message sent to specific client', { target, event });
        } else {
          this.log('warn', 'Target client not found', { target });
          return false;
        }
      } else {
        // 广播给所有客户端
        this.io.emit(event, payload);
        this.log('debug', 'Message broadcasted to all clients', { event });
      }

      return true;
    } catch (error) {
      this.log('error', 'Failed to publish WebSocket message', { error });
      return false;
    }
  }

  /**
   * 订阅主题 - WebSocket通过事件监听
   */
  async subscribe(topic: string, options: any = {}): Promise<boolean> {
    this.log('debug', 'WebSocket adapter subscribe called', { topic });
    return true;
  }

  /**
   * 取消订阅
   */
  async unsubscribe(topic: string): Promise<boolean> {
    this.log('debug', 'WebSocket adapter unsubscribe called', { topic });
    return true;
  }

  /**
   * 关闭适配器
   */
  async shutdown(): Promise<void> {
    try {
      // 断开所有客户端连接
      for (const [clientId, socket] of this.connectedClients) {
        socket.disconnect();
        this.log('debug', 'Disconnected WebSocket client', { clientId });
      }

      this.connectedClients.clear();
      this.initialized = false;
      this.updateStatus({ connected: false });
      this.log('info', 'WebSocket adapter shutdown');
    } catch (error) {
      this.log('error', 'Failed to shutdown WebSocket adapter', { error });
      throw error;
    }
  }

  /**
   * 获取连接统计
   */
  getConnectionStats(): {
    connectedClients: number;
    clientIds: string[];
  } {
    return {
      connectedClients: this.connectedClients.size,
      clientIds: Array.from(this.connectedClients.keys())
    };
  }

  /**
   * 向特定设备发送消息
   */
  async sendToDevice(deviceId: string, message: any): Promise<boolean> {
    try {
      if (!this.io) return false;

      // 查找设备对应的客户端连接
      for (const [clientId, socket] of this.connectedClients) {
        const socketData = socket.data as any;
        if (socketData.deviceId === deviceId) {
          socket.emit('device.command', message);
          this.log('debug', 'Message sent to device', { deviceId, clientId });
          return true;
        }
      }

      this.log('warn', 'Device not found in connected clients', { deviceId });
      return false;
    } catch (error) {
      this.log('error', 'Failed to send message to device', { deviceId, error });
      return false;
    }
  }

  /**
   * 广播消息给所有设备
   */
  async broadcastToDevices(message: any): Promise<boolean> {
    try {
      if (!this.io) return false;

      this.io.emit('device.broadcast', message);
      this.log('debug', 'Message broadcasted to all devices');
      return true;
    } catch (error) {
      this.log('error', 'Failed to broadcast message to devices', { error });
      return false;
    }
  }
}
