/**
 * 通用设备插件
 * 提供基础的设备功能
 */

import { BaseDevicePlugin } from '@/core/device-plugin';
import { PluginConfig, PluginContext } from '@/core/plugin-interface';
import { MessageType } from '@/core/event-bus';

const pluginConfig: PluginConfig = {
  name: "generic-device-plugin",
  version: "1.0.0",
  description: "通用设备插件，提供基础设备功能",
  author: "IoT Platform Team",
  dependencies: [],
  config: {
    telemetryMetrics: [
      { name: "status", type: "string" },
      { name: "timestamp", type: "number" },
      { name: "battery", type: "number", unit: "%" },
      { name: "signal", type: "number", unit: "dBm" }
    ],
    commands: [
      { name: "ping", description: "设备心跳检测" },
      { name: "reboot", description: "重启设备" },
      { name: "get_info", description: "获取设备信息" }
    ],
    features: {
      basicTelemetry: true,
      deviceControl: true,
      statusReporting: true
    }
  }
};

export class GenericDevicePlugin extends BaseDevicePlugin {
  constructor(deviceType: string) {
    super(deviceType, pluginConfig);
  }

  async init(context: PluginContext): Promise<void> {
    await super.init(context);
    this.context.logger.info(`GenericDevicePlugin for ${this.deviceType} initialized`);
  }

  async processDeviceMessage(message: any): Promise<any> {
    this.context.logger.debug(`GenericDevicePlugin processing message for ${message.deviceId}:`, message);
    
    // 基础消息验证
    if (!message.deviceId || !message.timestamp) {
      this.context.logger.warn(`Invalid message format for device ${message.deviceId}`);
      return { ...message, valid: false, error: 'Invalid message format' };
    }

    // 根据消息类型处理
    switch (message.messageType) {
      case MessageType.TELEMETRY:
        return this.processTelemetry(message);
      case MessageType.STATUS:
        return this.processStatus(message);
      case MessageType.EVENT:
        return this.processEvent(message);
      default:
        this.context.logger.warn(`Unknown message type: ${message.messageType}`);
        return message;
    }
  }

  private processTelemetry(message: any): any {
    const telemetryData = message.payload;
    
    // 基础数据验证
    if (typeof telemetryData.battery === 'number' && (telemetryData.battery < 0 || telemetryData.battery > 100)) {
      this.context.logger.warn(`Invalid battery level for device ${message.deviceId}: ${telemetryData.battery}%`);
    }
    
    if (typeof telemetryData.signal === 'number' && telemetryData.signal > 0) {
      this.context.logger.warn(`Invalid signal strength for device ${message.deviceId}: ${telemetryData.signal} dBm`);
    }

    // 添加处理时间戳
    return {
      ...message,
      processedAt: new Date(),
      valid: true
    };
  }

  private processStatus(message: any): any {
    const statusData = message.payload;
    
    // 状态验证
    const validStatuses = ['online', 'offline', 'error', 'maintenance'];
    if (statusData.status && !validStatuses.includes(statusData.status)) {
      this.context.logger.warn(`Invalid status for device ${message.deviceId}: ${statusData.status}`);
    }

    return {
      ...message,
      processedAt: new Date(),
      valid: true
    };
  }

  private processEvent(message: any): any {
    const eventData = message.payload;
    
    // 事件验证
    if (!eventData.eventType || !eventData.description) {
      this.context.logger.warn(`Incomplete event data for device ${message.deviceId}`);
    }

    return {
      ...message,
      processedAt: new Date(),
      valid: true
    };
  }

  async processDeviceCommand(command: any): Promise<any> {
    this.context.logger.info(`GenericDevicePlugin processing command for ${command.deviceId}:`, command);
    
    // 命令验证
    const validCommands = ['ping', 'reboot', 'get_info'];
    if (!validCommands.includes(command.name)) {
      return {
        status: 'error',
        message: `Unknown command: ${command.name}`,
        validCommands
      };
    }

    // 根据命令类型执行
    switch (command.name) {
      case 'ping':
        return this.handlePingCommand(command);
      case 'reboot':
        return this.handleRebootCommand(command);
      case 'get_info':
        return this.handleGetInfoCommand(command);
      default:
        return {
          status: 'error',
          message: 'Command not implemented'
        };
    }
  }

  private handlePingCommand(command: any): any {
    this.context.logger.info(`Ping command sent to device ${command.deviceId}`);
    return {
      status: 'success',
      message: 'Ping command sent',
      timestamp: new Date()
    };
  }

  private handleRebootCommand(command: any): any {
    this.context.logger.info(`Reboot command sent to device ${command.deviceId}`);
    return {
      status: 'success',
      message: 'Reboot command sent',
      timestamp: new Date(),
      warning: 'Device will be offline during reboot'
    };
  }

  private handleGetInfoCommand(command: any): any {
    this.context.logger.info(`Get info command sent to device ${command.deviceId}`);
    return {
      status: 'success',
      message: 'Get info command sent',
      timestamp: new Date()
    };
  }

  async onConfigUpdate(newConfig: any): Promise<void> {
    await super.onConfigUpdate(newConfig);
    this.context.logger.info(`GenericDevicePlugin for ${this.deviceType} config updated:`, newConfig);
  }

  async shutdown(): Promise<void> {
    await super.shutdown();
    this.context.logger.info(`GenericDevicePlugin for ${this.deviceType} shutting down`);
  }
}

export default GenericDevicePlugin;
