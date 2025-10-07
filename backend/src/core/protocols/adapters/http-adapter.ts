/**
 * HTTP 协议适配器
 * 处理设备的HTTP POST/GET请求，与云端通信
 */

import { BaseProtocolAdapter } from './adapter-base';
import { ProtocolType, ProtocolConfig, ProtocolMessage } from '../protocol-types';
import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import { logger } from '@/common/logger';

export class HTTPAdapter extends BaseProtocolAdapter {
  private server: any;
  private routes: Map<string, (req: Request, res: Response) => void> = new Map();

  constructor(config: ProtocolConfig) {
    super(ProtocolType.HTTP, config);
  }

  /**
   * 初始化HTTP适配器
   */
  async initialize(): Promise<void> {
    try {
      this.validateConfig();
      this.setupRoutes();
      this.initialized = true;
      this.updateStatus({ connected: true });
      this.log('info', 'HTTP adapter initialized');
    } catch (error) {
      this.log('error', 'Failed to initialize HTTP adapter', { error });
      throw error;
    }
  }

  /**
   * 设置HTTP路由
   */
  private setupRoutes(): void {
    // 设备数据上报路由
    this.routes.set('POST /api/devices/:deviceId/telemetry', this.handleTelemetry.bind(this));
    this.routes.set('POST /api/devices/:deviceId/status', this.handleStatus.bind(this));
    this.routes.set('POST /api/devices/:deviceId/events', this.handleEvents.bind(this));
    this.routes.set('POST /api/devices/:deviceId/ota/progress', this.handleOTAProgress.bind(this));
    
    // 设备配置获取路由
    this.routes.set('GET /api/devices/:deviceId/config', this.handleConfigRequest.bind(this));
    this.routes.set('GET /api/devices/:deviceId/commands', this.handleCommandsRequest.bind(this));
    
    // 设备注册路由
    this.routes.set('POST /api/devices/register', this.handleDeviceRegister.bind(this));
  }

  /**
   * 处理遥测数据
   */
  private async handleTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.params.deviceId;
      const { tenantId, deviceType, data } = req.body;

      const message: ProtocolMessage = {
        protocol: ProtocolType.HTTP,
        payload: {
          type: 'telemetry',
          tenantId,
          deviceId,
          deviceType,
          data,
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'http-adapter'
      };

      // 发送到事件总线
      this.emit('message', message);

      res.json({ success: true, message: 'Telemetry data received' });
    } catch (error) {
      this.log('error', 'Failed to handle telemetry', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * 处理状态更新
   */
  private async handleStatus(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.params.deviceId;
      const { tenantId, deviceType, status, previousStatus } = req.body;

      const message: ProtocolMessage = {
        protocol: ProtocolType.HTTP,
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
        source: 'http-adapter'
      };

      this.emit('message', message);
      res.json({ success: true, message: 'Status updated' });
    } catch (error) {
      this.log('error', 'Failed to handle status', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * 处理设备事件
   */
  private async handleEvents(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.params.deviceId;
      const { tenantId, deviceType, eventType, description, severity, data } = req.body;

      const message: ProtocolMessage = {
        protocol: ProtocolType.HTTP,
        payload: {
          type: 'device_event',
          tenantId,
          deviceId,
          deviceType,
          eventType,
          description,
          severity,
          data,
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'http-adapter'
      };

      this.emit('message', message);
      res.json({ success: true, message: 'Event received' });
    } catch (error) {
      this.log('error', 'Failed to handle event', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * 处理OTA进度
   */
  private async handleOTAProgress(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.params.deviceId;
      const { tenantId, deviceType, progress, status, message } = req.body;

      const protocolMessage: ProtocolMessage = {
        protocol: ProtocolType.HTTP,
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
        source: 'http-adapter'
      };

      this.emit('message', protocolMessage);
      res.json({ success: true, message: 'OTA progress updated' });
    } catch (error) {
      this.log('error', 'Failed to handle OTA progress', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * 处理配置请求
   */
  private async handleConfigRequest(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.params.deviceId;
      // 这里应该从配置中心获取设备配置
      const config = {
        deviceId,
        mqtt: {
          broker: 'mqtt://broker.example.com',
          port: 1883,
          topics: {
            telemetry: `devices/${deviceId}/telemetry`,
            status: `devices/${deviceId}/status`
          }
        },
        sampling: {
          interval: 1000,
          enabled: true
        }
      };

      res.json({ success: true, data: config });
    } catch (error) {
      this.log('error', 'Failed to handle config request', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * 处理命令请求
   */
  private async handleCommandsRequest(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.params.deviceId;
      // 这里应该从命令队列获取待执行的命令
      const commands = [
        {
          id: 'cmd_001',
          type: 'reboot',
          parameters: { delay: 5 },
          timestamp: new Date()
        }
      ];

      res.json({ success: true, data: commands });
    } catch (error) {
      this.log('error', 'Failed to handle commands request', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * 处理设备注册
   */
  private async handleDeviceRegister(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, deviceType, tenantId, capabilities, firmware } = req.body;

      const message: ProtocolMessage = {
        protocol: ProtocolType.HTTP,
        payload: {
          type: 'device_register',
          tenantId,
          deviceId,
          deviceType,
          capabilities,
          firmware,
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'http-adapter'
      };

      this.emit('message', message);
      res.json({ success: true, message: 'Device registered successfully' });
    } catch (error) {
      this.log('error', 'Failed to handle device register', { error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * 发布消息 - HTTP适配器通过响应发送
   */
  async publish(topic: string, payload: any, options: any = {}): Promise<boolean> {
    // HTTP适配器不直接发布消息，而是通过响应发送
    this.log('debug', 'HTTP adapter publish called', { topic, payload });
    return true;
  }

  /**
   * 订阅主题 - HTTP适配器通过路由处理
   */
  async subscribe(topic: string, options: any = {}): Promise<boolean> {
    this.log('debug', 'HTTP adapter subscribe called', { topic });
    return true;
  }

  /**
   * 取消订阅
   */
  async unsubscribe(topic: string): Promise<boolean> {
    this.log('debug', 'HTTP adapter unsubscribe called', { topic });
    return true;
  }

  /**
   * 关闭适配器
   */
  async shutdown(): Promise<void> {
    try {
      this.routes.clear();
      this.initialized = false;
      this.updateStatus({ connected: false });
      this.log('info', 'HTTP adapter shutdown');
    } catch (error) {
      this.log('error', 'Failed to shutdown HTTP adapter', { error });
      throw error;
    }
  }

  /**
   * 获取路由处理器
   */
  getRoutes(): Map<string, (req: Request, res: Response) => void> {
    return this.routes;
  }
}
