/**
 * MQTT 协议适配器
 * 功能：接收 MQTT 消息并转发到统一消息总线
 */

import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';
import { configManager } from '@/config/config';
import { 
  messageBus, 
  Channels, 
  MessageType, 
  TelemetryMessage,
  StatusChangeMessage,
  DeviceEventMessage,
  OTAProgressMessage,
} from '@/services/message-bus';
import { prisma } from '@/config/database';
import { DeviceTemplateEngine, TemplateManager } from '@/services/device-template/engine';

/**
 * MQTT 适配器类
 */
export class MQTTAdapter extends EventEmitter {
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  /**
   * 初始化 MQTT 适配器
   */
  async initialize(): Promise<void> {
    try {
      const mqttConfig = configManager.get('mqtt');
      const brokerUrl = mqttConfig.broker;

      const options: mqtt.IClientOptions = {
        clientId: mqttConfig.options.clientId || `iot-gateway-${Date.now()}`,
        clean: true,
        connectTimeout: mqttConfig.options.connectTimeout || 30000,
        reconnectPeriod: 5000,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        will: {
          topic: 'system/gateway/status',
          payload: JSON.stringify({ status: 'offline', timestamp: new Date() }),
          qos: 1,
          retain: true,
        },
      };

      this.client = mqtt.connect(brokerUrl, options);
      this.setupEventListeners();

      logger.info('MQTT Adapter initialized', { broker: brokerUrl });
    } catch (error) {
      logger.error('Failed to initialize MQTT Adapter', { error });
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('MQTT Adapter connected');

      // 发布网关在线状态
      this.publish('system/gateway/status', {
        status: 'online',
        timestamp: new Date(),
      });

      // 订阅设备主题
      this.subscribeToTopics();
      this.emit('connected');
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
      logger.warn('MQTT Adapter disconnected');
      this.emit('disconnected');
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      logger.info(`MQTT Adapter reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    });

    this.client.on('error', (error) => {
      logger.error('MQTT Adapter error', { error: error.message });
      this.emit('error', error);
    });

    this.client.on('message', async (topic, payload, packet) => {
      await this.handleMessage(topic, payload, packet);
    });
  }

  /**
   * 订阅设备主题
   */
  private subscribeToTopics(): void {
    if (!this.client || !this.isConnected) return;

    const topics = [
      // 设备遥测数据
      'devices/+/telemetry',
      'devices/+/data',
      
      // 设备状态
      'devices/+/status',
      'devices/+/online',
      'devices/+/offline',
      
      // 设备事件
      'devices/+/events',
      'devices/+/alert',
      
      // OTA 相关
      'devices/+/ota/progress',
      'devices/+/ota/status',
      
      // 设备指令响应
      'devices/+/command/response',
      
      // 通配符订阅（可选）
      'devices/#',
    ];

    for (const topic of topics) {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          logger.error(`Failed to subscribe to ${topic}`, { error: err.message });
        } else {
          logger.debug(`Subscribed to topic: ${topic}`);
        }
      });
    }
  }

  /**
   * 处理 MQTT 消息
   */
  private async handleMessage(
    topic: string,
    payload: Buffer,
    packet: mqtt.IPublishPacket
  ): Promise<void> {
    try {
      // 解析消息
      const message = JSON.parse(payload.toString());
      
      // 提取设备 ID
      const deviceId = this.extractDeviceId(topic);
      if (!deviceId) {
        logger.warn('Cannot extract device ID from topic', { topic });
        return;
      }

      // 查询设备信息（包含租户 ID 和模板）
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        include: { template: true },
      });

      if (!device) {
        logger.warn('Device not found', { deviceId, topic });
        return;
      }

      // 更新设备最后在线时间
      await prisma.device.update({
        where: { id: deviceId },
        data: { lastSeenAt: new Date() },
      });

      // 根据主题路由到不同的处理器
      if (topic.includes('/telemetry') || topic.includes('/data')) {
        await this.handleTelemetry(device, message);
      } else if (topic.includes('/status') || topic.includes('/online') || topic.includes('/offline')) {
        await this.handleStatusChange(device, message, topic);
      } else if (topic.includes('/events') || topic.includes('/alert')) {
        await this.handleEvent(device, message);
      } else if (topic.includes('/ota/progress')) {
        await this.handleOTAProgress(device, message);
      } else if (topic.includes('/ota/status')) {
        await this.handleOTAStatus(device, message);
      } else if (topic.includes('/command/response')) {
        await this.handleCommandResponse(device, message);
      }

    } catch (error) {
      logger.error('Failed to handle MQTT message', {
        topic,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理遥测数据
   */
  private async handleTelemetry(device: any, data: any): Promise<void> {
    try {
      // 使用模板引擎验证数据
      const templateEngine = TemplateManager.setTemplate(device.templateId, device.template);
      const validation = templateEngine.validateTelemetry(data);

      if (!validation.valid) {
        logger.warn('Telemetry validation failed', {
          deviceId: device.id,
          errors: validation.errors.map((e) => e.message),
        });
        // 可选：发送告警或记录错误
      }

      // 发布到消息总线
      const message: TelemetryMessage = {
        type: MessageType.TELEMETRY,
        tenantId: device.tenantId,
        deviceId: device.id,
        timestamp: new Date(),
        protocol: 'mqtt',
        source: 'mqtt-adapter',
        metrics: validation.normalized,
        quality: validation.valid ? 'GOOD' : 'UNCERTAIN',
      };

      await messageBus.publish(Channels.TELEMETRY, message);

      logger.debug('Telemetry message published to bus', {
        deviceId: device.id,
        metricsCount: Object.keys(validation.normalized).length,
      });
    } catch (error) {
      logger.error('Failed to handle telemetry', {
        deviceId: device.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理状态变更
   */
  private async handleStatusChange(device: any, data: any, topic: string): Promise<void> {
    try {
      let status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'MAINTENANCE' = 'ONLINE';

      if (topic.includes('/offline')) {
        status = 'OFFLINE';
      } else if (topic.includes('/online')) {
        status = 'ONLINE';
      } else if (data.status) {
        status = data.status;
      }

      // 更新数据库
      await prisma.device.update({
        where: { id: device.id },
        data: { status },
      });

      // 发布到消息总线
      const message: StatusChangeMessage = {
        type: MessageType.STATUS_CHANGE,
        tenantId: device.tenantId,
        deviceId: device.id,
        timestamp: new Date(),
        protocol: 'mqtt',
        source: 'mqtt-adapter',
        status,
        previousStatus: device.status,
        context: data.context || {},
      };

      await messageBus.publish(Channels.STATUS, message);

      logger.info('Device status changed', {
        deviceId: device.id,
        status,
      });
    } catch (error) {
      logger.error('Failed to handle status change', {
        deviceId: device.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理设备事件
   */
  private async handleEvent(device: any, data: any): Promise<void> {
    try {
      // 使用模板引擎验证事件
      const templateEngine = TemplateManager.setTemplate(device.templateId, device.template);
      const validation = templateEngine.validateEvent(data.eventType, data.data || {});

      if (!validation.valid) {
        logger.warn('Event validation failed', {
          deviceId: device.id,
          eventType: data.eventType,
          errors: validation.errors.map((e) => e.message),
        });
      }

      // 发布到消息总线
      const message: DeviceEventMessage = {
        type: MessageType.DEVICE_EVENT,
        tenantId: device.tenantId,
        deviceId: device.id,
        timestamp: new Date(),
        protocol: 'mqtt',
        source: 'mqtt-adapter',
        eventType: data.eventType,
        level: validation.eventDef?.level || 'INFO',
        data: validation.normalized,
        title: data.title,
        message: data.message,
      };

      await messageBus.publish(Channels.EVENTS, message);

      logger.info('Device event published', {
        deviceId: device.id,
        eventType: data.eventType,
        level: message.level,
      });
    } catch (error) {
      logger.error('Failed to handle event', {
        deviceId: device.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理 OTA 进度
   */
  private async handleOTAProgress(device: any, data: any): Promise<void> {
    try {
      const message: OTAProgressMessage = {
        type: MessageType.OTA_PROGRESS,
        tenantId: device.tenantId,
        deviceId: device.id,
        timestamp: new Date(),
        protocol: 'mqtt',
        source: 'mqtt-adapter',
        rolloutId: data.rolloutId,
        progress: data.progress || 0,
        stage: data.stage || 'DOWNLOADING',
      };

      await messageBus.publish(Channels.OTA_PROGRESS, message);

      logger.debug('OTA progress updated', {
        deviceId: device.id,
        progress: data.progress,
      });
    } catch (error) {
      logger.error('Failed to handle OTA progress', {
        deviceId: device.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理 OTA 状态
   */
  private async handleOTAStatus(device: any, data: any): Promise<void> {
    try {
      const message = {
        type: MessageType.OTA_STATUS,
        tenantId: device.tenantId,
        deviceId: device.id,
        timestamp: new Date(),
        protocol: 'mqtt',
        source: 'mqtt-adapter',
        rolloutId: data.rolloutId,
        status: data.status,
        error: data.error,
      };

      await messageBus.publish(Channels.OTA_STATUS, message);

      logger.info('OTA status updated', {
        deviceId: device.id,
        status: data.status,
      });
    } catch (error) {
      logger.error('Failed to handle OTA status', {
        deviceId: device.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 处理指令响应
   */
  private async handleCommandResponse(device: any, data: any): Promise<void> {
    try {
      const message = {
        type: MessageType.COMMAND_RESPONSE,
        tenantId: device.tenantId,
        deviceId: device.id,
        timestamp: new Date(),
        protocol: 'mqtt',
        source: 'mqtt-adapter',
        commandId: data.commandId,
        success: data.success || false,
        result: data.result,
        error: data.error,
      };

      await messageBus.publish(Channels.COMMAND_RESPONSES, message);

      logger.debug('Command response received', {
        deviceId: device.id,
        commandId: data.commandId,
        success: data.success,
      });
    } catch (error) {
      logger.error('Failed to handle command response', {
        deviceId: device.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 从主题提取设备 ID
   */
  private extractDeviceId(topic: string): string | null {
    // 支持多种格式：
    // devices/{deviceId}/telemetry
    // {tenantId}/devices/{deviceId}/data
    const match = topic.match(/devices\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * 发布消息到 MQTT
   */
  publish(topic: string, payload: any, options?: mqtt.IClientPublishOptions): void {
    if (!this.client || !this.isConnected) {
      logger.warn('MQTT client not connected, cannot publish');
      return;
    }

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    this.client.publish(topic, message, options || { qos: 1 }, (err) => {
      if (err) {
        logger.error('Failed to publish MQTT message', { topic, error: err.message });
      }
    });
  }

  /**
   * 发送指令到设备
   */
  async sendCommand(deviceId: string, commandName: string, params: any): Promise<void> {
    const topic = `devices/${deviceId}/command/${commandName}`;
    this.publish(topic, params);
  }

  /**
   * 关闭连接
   */
  async shutdown(): Promise<void> {
    if (this.client) {
      this.publish('system/gateway/status', {
        status: 'offline',
        timestamp: new Date(),
      });

      await this.client.endAsync();
      this.isConnected = false;
      logger.info('MQTT Adapter shutdown');
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export default MQTTAdapter;

