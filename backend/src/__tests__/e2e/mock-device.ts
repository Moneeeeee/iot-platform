/**
 * 模拟IoT设备客户端
 * 
 * 这个模拟设备可以：
 * 1. 连接到现有的MQTT Broker
 * 2. 执行设备引导流程
 * 3. 发送遥测数据、状态信息
 * 4. 接收命令和配置更新
 * 5. 监控MQTT连接状态和消息流
 */

import * as mqtt from 'mqtt';
import axios from 'axios';
import { EventEmitter } from 'events';

// 设备配置接口
interface DeviceConfig {
  deviceId: string;
  mac: string;
  deviceType: 'sensor' | 'gateway' | 'rtu' | 'ps-ctrl' | 'dtu';
  firmware: {
    current: string;
    build: string;
    minRequired: string;
    channel: 'stable' | 'beta' | 'alpha';
  };
  hardware: {
    version: string;
    serial: string;
  };
  capabilities: Array<{ name: string }>;
  tenantId: string;
}

// MQTT配置接口
interface MqttConfig {
  broker: string;
  username: string;
  password: string;
  clientId: string;
  topics: {
    telemetryPub: string;
    statusPub: string;
    eventPub: string;
    cmdSub: string;
    cmdresPub: string;
    shadowDesiredSub: string;
    shadowReportedPub: string;
    cfgSub: string;
    otaProgressPub: string;
  };
  qosRetainPolicy: Array<{
    topic: string;
    qos: 0 | 1 | 2;
    retain: boolean;
  }>;
  acl: {
    publish: string[];
    subscribe: string[];
  };
}

// 设备状态接口
interface DeviceStatus {
  online: boolean;
  battery?: number;
  rssi?: number;
  temperature?: number;
  humidity?: number;
  lastSeen: Date;
  errors: string[];
}

/**
 * 模拟IoT设备类
 */
export class MockIoTDevice extends EventEmitter {
  private config: DeviceConfig;
  private mqttConfig: MqttConfig | null = null;
  private mqttClient: mqtt.MqttClient | null = null;
  private status: DeviceStatus;
  private bootstrapUrl: string;
  private isConnected = false;
  private messageCount = 0;
  private errorCount = 0;

  constructor(config: DeviceConfig, bootstrapUrl: string = 'http://localhost:8000') {
    super();
    this.config = config;
    this.bootstrapUrl = bootstrapUrl;
    this.status = {
      online: false,
      lastSeen: new Date(),
      errors: []
    };
  }

  /**
   * 启动设备
   */
  async start(): Promise<void> {
    console.log(`🚀 Starting mock device: ${this.config.deviceId}`);
    
    try {
      // 1. 执行引导流程
      await this.performBootstrap();
      
      // 2. 连接到MQTT Broker
      await this.connectToMqtt();
      
      // 3. 开始发送数据
      this.startDataTransmission();
      
      // 4. 监听命令
      this.listenForCommands();
      
      this.status.online = true;
      this.emit('started', this.config.deviceId);
      
      console.log(`✅ Device ${this.config.deviceId} started successfully`);
    } catch (error) {
      this.handleError('Failed to start device', error);
      throw error;
    }
  }

  /**
   * 停止设备
   */
  async stop(): Promise<void> {
    console.log(`🛑 Stopping mock device: ${this.config.deviceId}`);
    
    this.status.online = false;
    
    if (this.mqttClient) {
      await this.mqttClient.endAsync();
      this.mqttClient = null;
    }
    
    this.emit('stopped', this.config.deviceId);
    console.log(`✅ Device ${this.config.deviceId} stopped`);
  }

  /**
   * 执行设备引导流程
   */
  private async performBootstrap(): Promise<void> {
    console.log(`📡 Performing bootstrap for device: ${this.config.deviceId}`);
    
    const bootstrapRequest = {
      ...this.config,
      timestamp: Date.now()
    };

    try {
      const response = await axios.post(
        `${this.bootstrapUrl}/api/config/bootstrap`,
        bootstrapRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': this.config.tenantId
          },
          timeout: 10000
        }
      );

      if (response.status === 200 && response.data.success) {
        this.mqttConfig = response.data.data.mqtt;
        console.log(`✅ Bootstrap successful for ${this.config.deviceId}`);
        console.log(`📋 MQTT Topics:`, this.mqttConfig.topics);
        this.emit('bootstrap-success', this.mqttConfig);
      } else {
        throw new Error(`Bootstrap failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      this.handleError('Bootstrap failed', error);
      throw error;
    }
  }

  /**
   * 连接到MQTT Broker
   */
  private async connectToMqtt(): Promise<void> {
    if (!this.mqttConfig) {
      throw new Error('MQTT config not available. Perform bootstrap first.');
    }

    console.log(`🔌 Connecting to MQTT Broker: ${this.mqttConfig.broker}`);
    
    const client = mqtt.connect(this.mqttConfig.broker, {
      username: this.mqttConfig.username,
      password: this.mqttConfig.password,
      clientId: this.mqttConfig.clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000
    });

    return new Promise((resolve, reject) => {
      client.on('connect', () => {
        console.log(`✅ MQTT connected: ${this.config.deviceId}`);
        this.mqttClient = client;
        this.isConnected = true;
        this.emit('mqtt-connected');
        resolve();
      });

      client.on('error', (error) => {
        this.handleError('MQTT connection error', error);
        reject(error);
      });

      client.on('disconnect', () => {
        console.log(`⚠️ MQTT disconnected: ${this.config.deviceId}`);
        this.isConnected = false;
        this.emit('mqtt-disconnected');
      });

      client.on('reconnect', () => {
        console.log(`🔄 MQTT reconnecting: ${this.config.deviceId}`);
        this.emit('mqtt-reconnecting');
      });

      // 超时处理
      setTimeout(() => {
        if (!client.connected) {
          reject(new Error('MQTT connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * 开始数据传输
   */
  private startDataTransmission(): void {
    if (!this.mqttClient || !this.mqttConfig) {
      return;
    }

    console.log(`📊 Starting data transmission for: ${this.config.deviceId}`);

    // 发送状态信息（每30秒）
    const statusInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendStatusUpdate();
      }
    }, 30000);

    // 发送遥测数据（每10秒）
    const telemetryInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendTelemetryData();
      }
    }, 10000);

    // 清理定时器
    this.on('stopped', () => {
      clearInterval(statusInterval);
      clearInterval(telemetryInterval);
    });
  }

  /**
   * 发送状态更新
   */
  private async sendStatusUpdate(): Promise<void> {
    if (!this.mqttClient || !this.mqttConfig) {
      return;
    }

    const statusData = {
      ts: Date.now(),
      msgId: `status-${this.messageCount++}`,
      deviceId: this.config.deviceId,
      tenant: this.config.tenantId,
      ver: '1',
      online: this.status.online,
      battery: Math.floor(Math.random() * 100), // 模拟电池电量
      rssi: -Math.floor(Math.random() * 50) - 30, // 模拟信号强度
      temperature: 20 + Math.random() * 10, // 模拟温度
      humidity: 40 + Math.random() * 40, // 模拟湿度
      errors: this.status.errors.length
    };

    try {
      const qosPolicy = this.mqttConfig.qosRetainPolicy.find(
        p => p.topic === this.mqttConfig!.topics.statusPub
      );

      await this.publishMessage(
        this.mqttConfig.topics.statusPub,
        statusData,
        {
          qos: qosPolicy?.qos || 1,
          retain: qosPolicy?.retain || true
        }
      );

      this.status.lastSeen = new Date();
      this.emit('status-sent', statusData);
    } catch (error) {
      this.handleError('Failed to send status update', error);
    }
  }

  /**
   * 发送遥测数据
   */
  private async sendTelemetryData(): Promise<void> {
    if (!this.mqttClient || !this.mqttConfig) {
      return;
    }

    const telemetryData = {
      ts: Date.now(),
      msgId: `telemetry-${this.messageCount++}`,
      deviceId: this.config.deviceId,
      tenant: this.config.tenantId,
      ver: '1',
      metrics: {
        temperature: 20 + Math.random() * 10,
        humidity: 40 + Math.random() * 40,
        pressure: 1000 + Math.random() * 100,
        light: Math.random() * 1000
      },
      mode: 'periodic'
    };

    try {
      const qosPolicy = this.mqttConfig.qosRetainPolicy.find(
        p => p.topic === this.mqttConfig!.topics.telemetryPub
      );

      await this.publishMessage(
        this.mqttConfig.topics.telemetryPub,
        telemetryData,
        {
          qos: qosPolicy?.qos || 1,
          retain: qosPolicy?.retain || false
        }
      );

      this.emit('telemetry-sent', telemetryData);
    } catch (error) {
      this.handleError('Failed to send telemetry data', error);
    }
  }

  /**
   * 监听命令
   */
  private listenForCommands(): void {
    if (!this.mqttClient || !this.mqttConfig) {
      return;
    }

    console.log(`👂 Listening for commands on: ${this.mqttConfig.topics.cmdSub}`);

    this.mqttClient.subscribe(this.mqttConfig.topics.cmdSub, { qos: 1 }, (error) => {
      if (error) {
        this.handleError('Failed to subscribe to commands', error);
      } else {
        console.log(`✅ Subscribed to commands: ${this.mqttConfig!.topics.cmdSub}`);
      }
    });

    this.mqttClient.on('message', (topic, payload) => {
      if (topic === this.mqttConfig!.topics.cmdSub) {
        try {
          const command = JSON.parse(payload.toString());
          this.handleCommand(command);
        } catch (error) {
          this.handleError('Failed to parse command', error);
        }
      }
    });
  }

  /**
   * 处理接收到的命令
   */
  private async handleCommand(command: any): Promise<void> {
    console.log(`📨 Received command:`, command);
    this.emit('command-received', command);

    try {
      // 模拟命令处理
      const response = {
        ts: Date.now(),
        msgId: `cmdres-${this.messageCount++}`,
        deviceId: this.config.deviceId,
        tenant: this.config.tenantId,
        ver: '1',
        cmdId: command.cmdId || 'unknown',
        status: 'success',
        result: 'Command executed successfully'
      };

      if (this.mqttClient && this.mqttConfig) {
        await this.publishMessage(
          this.mqttConfig.topics.cmdresPub,
          response,
          { qos: 1, retain: false }
        );

        this.emit('command-response-sent', response);
      }
    } catch (error) {
      this.handleError('Failed to handle command', error);
    }
  }

  /**
   * 发布MQTT消息
   */
  private async publishMessage(
    topic: string,
    message: any,
    options: mqtt.IClientPublishOptions = {}
  ): Promise<void> {
    if (!this.mqttClient) {
      throw new Error('MQTT client not connected');
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    
    return new Promise((resolve, reject) => {
      this.mqttClient!.publish(topic, payload, options, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`📤 Published to ${topic}:`, message);
          resolve();
        }
      });
    });
  }

  /**
   * 处理错误
   */
  private handleError(message: string, error: any): void {
    const errorMsg = `${message}: ${error.message || error}`;
    console.error(`❌ ${this.config.deviceId}: ${errorMsg}`);
    
    this.status.errors.push(errorMsg);
    this.errorCount++;
    
    this.emit('error', { message: errorMsg, error, deviceId: this.config.deviceId });
  }

  /**
   * 获取设备状态
   */
  getStatus(): DeviceStatus & { messageCount: number; errorCount: number } {
    return {
      ...this.status,
      messageCount: this.messageCount,
      errorCount: this.errorCount
    };
  }

  /**
   * 获取MQTT配置
   */
  getMqttConfig(): MqttConfig | null {
    return this.mqttConfig;
  }

  /**
   * 检查连接状态
   */
  isDeviceConnected(): boolean {
    return this.isConnected && this.mqttClient?.connected === true;
  }
}

/**
 * 设备管理器
 */
export class DeviceManager {
  private devices: Map<string, MockIoTDevice> = new Map();
  private events: EventEmitter = new EventEmitter();

  constructor() {
    this.events.setMaxListeners(100);
  }

  /**
   * 创建设备
   */
  createDevice(config: DeviceConfig, bootstrapUrl?: string): MockIoTDevice {
    const device = new MockIoTDevice(config, bootstrapUrl);
    
    // 监听设备事件
    device.on('started', (deviceId) => this.events.emit('device-started', deviceId));
    device.on('stopped', (deviceId) => this.events.emit('device-stopped', deviceId));
    device.on('error', (error) => this.events.emit('device-error', error));
    device.on('mqtt-connected', () => this.events.emit('mqtt-connected', config.deviceId));
    device.on('mqtt-disconnected', () => this.events.emit('mqtt-disconnected', config.deviceId));
    device.on('telemetry-sent', (data) => this.events.emit('telemetry-sent', data));
    device.on('status-sent', (data) => this.events.emit('status-sent', data));
    device.on('command-received', (command) => this.events.emit('command-received', command));
    
    this.devices.set(config.deviceId, device);
    return device;
  }

  /**
   * 启动设备
   */
  async startDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    await device.start();
  }

  /**
   * 停止设备
   */
  async stopDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    await device.stop();
  }

  /**
   * 停止所有设备
   */
  async stopAllDevices(): Promise<void> {
    const promises = Array.from(this.devices.values()).map(device => device.stop());
    await Promise.all(promises);
  }

  /**
   * 获取设备
   */
  getDevice(deviceId: string): MockIoTDevice | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * 获取所有设备状态
   */
  getAllDeviceStatus(): Array<{ deviceId: string; status: any }> {
    return Array.from(this.devices.entries()).map(([deviceId, device]) => ({
      deviceId,
      status: device.getStatus()
    }));
  }

  /**
   * 监听事件
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}

// 导出
export { DeviceConfig, MqttConfig, DeviceStatus };
