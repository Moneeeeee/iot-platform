/**
 * WebSocket服务
 * 处理WebSocket连接和实时消息推送
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { EventEmitter } from 'events';
import jwt from 'jsonwebtoken';
import { logger } from '../common/logger';
import { prisma } from '../common/config/database';
import { User } from '../common/types';
import { config } from '../common/config/config';

/**
 * WebSocket连接信息接口
 */
interface WSConnection {
  socket: Socket;
  user: User;
  connectedAt: Date;
  lastActivity: Date;
}

/**
 * WebSocket服务类
 */
export class WebSocketService extends EventEmitter {
  private io: SocketIOServer;
  private connections: Map<string, WSConnection> = new Map();
  private deviceSubscriptions: Map<string, Set<string>> = new Map(); // deviceId -> Set<socketId>

  constructor(io: SocketIOServer) {
    super();
    this.io = io;
  }

  /**
   * 初始化WebSocket服务
   */
  public async initialize(): Promise<void> {
    try {
      // 设置认证中间件
      this.io.use(this.authenticateSocket.bind(this));

      // 设置默认命名空间连接事件监听器
      this.io.on('connection', this.handleConnection.bind(this));

      // 同时支持 /socket.io/ 命名空间（兼容性）
      this.io.of('/socket.io/').use(this.authenticateSocket.bind(this));
      this.io.of('/socket.io/').on('connection', this.handleConnection.bind(this));

      logger.info('WebSocket service initialized with default and /socket.io/ namespaces');

    } catch (error) {
      logger.error('Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  /**
   * Socket认证中间件
   * @param socket Socket连接
   * @param next 下一个中间件
   */
  private async authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // 验证JWT令牌
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          permissions: true,
          language: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      // 将用户信息添加到socket
      (socket as any).user = user;
      next();

    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  /**
   * 处理新的WebSocket连接
   * @param socket Socket连接
   */
  private handleConnection(socket: Socket): void {
    const user = (socket as any).user as User;
    const connectionId = socket.id;

    // 创建连接信息
    const connection: WSConnection = {
      socket,
      user,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    // 存储连接信息
    this.connections.set(connectionId, connection);

    logger.info('WebSocket client connected', {
      socketId: connectionId,
      userId: user.id,
      username: user.username,
    });

    // 设置事件监听器
    this.setupSocketEventListeners(socket, connection);

    // 发送连接成功消息
    socket.emit('connected', {
      message: 'Connected successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      timestamp: new Date(),
    });

    // 触发连接事件
    this.emit('clientConnected', { socket, user, connectionId });
  }

  /**
   * 设置Socket事件监听器
   * @param socket Socket连接
   * @param connection 连接信息
   */
  private setupSocketEventListeners(socket: Socket, connection: WSConnection): void {
    // 订阅设备数据
    socket.on('subscribe:device', (data) => {
      this.handleDeviceSubscription(socket, data);
    });

    // 取消订阅设备数据
    socket.on('unsubscribe:device', (data) => {
      this.handleDeviceUnsubscription(socket, data);
    });

    // 发送设备控制命令
    socket.on('device:control', (data) => {
      this.handleDeviceControl(socket, data);
    });

    // 心跳消息
    socket.on('ping', () => {
      connection.lastActivity = new Date();
      socket.emit('pong', { timestamp: new Date() });
    });

    // 断开连接事件
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // 错误事件
    socket.on('error', (error) => {
      logger.error('Socket error:', {
        socketId: socket.id,
        userId: connection.user.id,
        error: error.message,
      });
    });
  }

  /**
   * 处理设备订阅
   * @param socket Socket连接
   * @param data 订阅数据
   */
  private handleDeviceSubscription(socket: Socket, data: { deviceId: string }): void {
    const { deviceId } = data;
    const connection = this.connections.get(socket.id);
    
    if (!connection) return;

    // 检查用户权限
    if (!connection.user.permissions.includes('device:read' as any)) {
      socket.emit('error', {
        message: 'Insufficient permissions to subscribe to device data',
        code: 'PERMISSION_DENIED',
      });
      return;
    }

    // 添加到设备订阅列表
    if (!this.deviceSubscriptions.has(deviceId)) {
      this.deviceSubscriptions.set(deviceId, new Set());
    }
    this.deviceSubscriptions.get(deviceId)!.add(socket.id);

    // 加入设备房间
    socket.join(`device:${deviceId}`);

    logger.info('Device subscription', {
      socketId: socket.id,
      userId: connection.user.id,
      deviceId,
    });

    socket.emit('subscribed', {
      deviceId,
      message: 'Successfully subscribed to device data',
      timestamp: new Date(),
    });
  }

  /**
   * 处理设备取消订阅
   * @param socket Socket连接
   * @param data 取消订阅数据
   */
  private handleDeviceUnsubscription(socket: Socket, data: { deviceId: string }): void {
    const { deviceId } = data;
    const connection = this.connections.get(socket.id);
    
    if (!connection) return;

    // 从设备订阅列表移除
    const subscriptions = this.deviceSubscriptions.get(deviceId);
    if (subscriptions) {
      subscriptions.delete(socket.id);
      if (subscriptions.size === 0) {
        this.deviceSubscriptions.delete(deviceId);
      }
    }

    // 离开设备房间
    socket.leave(`device:${deviceId}`);

    logger.info('Device unsubscription', {
      socketId: socket.id,
      userId: connection.user.id,
      deviceId,
    });

    socket.emit('unsubscribed', {
      deviceId,
      message: 'Successfully unsubscribed from device data',
      timestamp: new Date(),
    });
  }

  /**
   * 处理设备控制命令
   * @param socket Socket连接
   * @param data 控制数据
   */
  private handleDeviceControl(socket: Socket, data: { deviceId: string; command: string; parameters?: any }): void {
    const { deviceId, command, parameters } = data;
    const connection = this.connections.get(socket.id);
    
    if (!connection) return;

    // 检查用户权限
    if (!connection.user.permissions.includes('device:control' as any)) {
      socket.emit('error', {
        message: 'Insufficient permissions to control device',
        code: 'PERMISSION_DENIED',
      });
      return;
    }

    logger.info('Device control command via WebSocket', {
      socketId: socket.id,
      userId: connection.user.id,
      deviceId,
      command,
      parameters,
    });

    // 触发设备控制事件
    this.emit('deviceControl', {
      deviceId,
      command,
      parameters,
      userId: connection.user.id,
      timestamp: new Date(),
    });

    // 发送确认消息
    socket.emit('control:sent', {
      deviceId,
      command,
      message: 'Control command sent successfully',
      timestamp: new Date(),
    });
  }

  /**
   * 处理连接断开
   * @param socket Socket连接
   * @param reason 断开原因
   */
  private handleDisconnection(socket: Socket, reason: string): void {
    const connection = this.connections.get(socket.id);
    
    if (connection) {
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        userId: connection.user.id,
        username: connection.user.username,
        reason,
        duration: Date.now() - connection.connectedAt.getTime(),
      });

      // 清理设备订阅
      for (const [deviceId, subscriptions] of this.deviceSubscriptions.entries()) {
        subscriptions.delete(socket.id);
        if (subscriptions.size === 0) {
          this.deviceSubscriptions.delete(deviceId);
        }
      }

      // 移除连接信息
      this.connections.delete(socket.id);

      // 触发断开连接事件
      this.emit('clientDisconnected', { socket, user: connection.user, reason });
    }
  }

  /**
   * 广播设备数据
   * @param deviceId 设备ID
   * @param data 数据
   */
  public broadcastDeviceData(deviceId: string, data: any): void {
    const room = `device:${deviceId}`;
    
    this.io.to(room).emit('device:data', {
      deviceId,
      data,
      timestamp: new Date(),
    });

    logger.debug('Device data broadcasted', {
      deviceId,
      room,
      subscriberCount: this.deviceSubscriptions.get(deviceId)?.size || 0,
    });
  }

  /**
   * 广播设备状态更新
   * @param deviceId 设备ID
   * @param status 状态
   */
  public broadcastDeviceStatus(deviceId: string, status: any): void {
    const room = `device:${deviceId}`;
    
    this.io.to(room).emit('device:status', {
      deviceId,
      status,
      timestamp: new Date(),
    });

    logger.debug('Device status broadcasted', {
      deviceId,
      room,
      status,
    });
  }

  /**
   * 广播设备告警
   * @param deviceId 设备ID
   * @param alert 告警信息
   */
  public broadcastDeviceAlert(deviceId: string, alert: any): void {
    const room = `device:${deviceId}`;
    
    this.io.to(room).emit('device:alert', {
      deviceId,
      alert,
      timestamp: new Date(),
    });

    logger.debug('Device alert broadcasted', {
      deviceId,
      room,
      alertLevel: alert.level,
    });
  }

  /**
   * 广播系统消息
   * @param message 消息
   * @param data 数据
   */
  public broadcastSystemMessage(message: string, data?: any): void {
    this.io.emit('system:message', {
      message,
      data,
      timestamp: new Date(),
    });

    logger.info('System message broadcasted', { message, data });
  }

  /**
   * 向特定用户发送消息
   * @param userId 用户ID
   * @param event 事件名称
   * @param data 数据
   */
  public sendToUser(userId: string, event: string, data: any): void {
    let sentCount = 0;
    
    for (const [socketId, connection] of this.connections.entries()) {
      if (connection.user.id === userId) {
        connection.socket.emit(event, data);
        sentCount++;
      }
    }

    logger.debug('Message sent to user', {
      userId,
      event,
      sentCount,
    });
  }

  /**
   * 获取连接统计信息
   */
  public getConnectionStats(): any {
    const stats = {
      totalConnections: this.connections.size,
      deviceSubscriptions: this.deviceSubscriptions.size,
      connectionsByUser: new Map<string, number>(),
      connectionsByRole: new Map<string, number>(),
    };

    // 统计用户连接数
    for (const connection of this.connections.values()) {
      const userId = connection.user.id;
      const role = connection.user.role;
      
      stats.connectionsByUser.set(userId, (stats.connectionsByUser.get(userId) || 0) + 1);
      stats.connectionsByRole.set(role, (stats.connectionsByRole.get(role) || 0) + 1);
    }

    return {
      totalConnections: stats.totalConnections,
      deviceSubscriptions: stats.deviceSubscriptions,
      connectionsByUser: Object.fromEntries(stats.connectionsByUser),
      connectionsByRole: Object.fromEntries(stats.connectionsByRole),
    };
  }

  /**
   * 获取活跃连接列表
   */
  public getActiveConnections(): any[] {
    return Array.from(this.connections.values()).map(connection => ({
      socketId: connection.socket.id,
      userId: connection.user.id,
      username: connection.user.username,
      role: connection.user.role,
      connectedAt: connection.connectedAt,
      lastActivity: connection.lastActivity,
    }));
  }

  /**
   * 关闭WebSocket服务
   */
  public async close(): Promise<void> {
    // 通知所有客户端服务即将关闭
    this.broadcastSystemMessage('Server is shutting down', {
      reason: 'maintenance',
    });

    // 关闭所有连接
    this.io.close();

    // 清理资源
    this.connections.clear();
    this.deviceSubscriptions.clear();

    logger.info('WebSocket service closed');
  }
}

// WebSocket服务类已在上面导出
