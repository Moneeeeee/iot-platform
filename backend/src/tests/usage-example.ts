/**
 * 协议适配器使用示例
 * 展示如何使用新的协议架构
 */

import { ProtocolManager, ProtocolManagerConfig } from './protocol-manager';
import { ProtocolType } from './protocol-types';
import { MQTTAdapter } from './adapters/mqtt-adapter';
import { HTTPAdapter } from './adapters/http-adapter';
import { WebSocketAdapter } from './adapters/websocket-adapter';
import { UDPAdapter } from './adapters/udp-adapter';
import { CoAPAdapter } from './adapters/coap-adapter';
import { eventBus, MessageType } from '../event-bus';

/**
 * 初始化协议管理器示例
 */
export async function initializeProtocolManager(): Promise<ProtocolManager> {
  // 配置所有协议
  const config: ProtocolManagerConfig = {
    mqtt: {
      enabled: true,
      host: 'mqtt://emqx:1883',
      port: 1883,
      username: 'iot_user',
      password: 'iot_password',
      clientId: 'iot-gateway'
    },
    websocket: {
      enabled: true,
      port: 3001,
      host: '0.0.0.0'
    },
    http: {
      enabled: true,
      port: 3002,
      host: '0.0.0.0'
    },
    udp: {
      enabled: true,
      port: 8888,
      host: '0.0.0.0'
    }
  };

  // 创建协议管理器实例
  const protocolManager = ProtocolManager.getInstance(config);
  
  // 初始化所有适配器
  await protocolManager.initialize();
  
  return protocolManager;
}

/**
 * 手动注册适配器示例
 */
export function registerCustomAdapters(): void {
  const protocolManager = ProtocolManager.getInstance();
  
  // 注册MQTT适配器
  const mqttAdapter = new MQTTAdapter({
    enabled: true,
    host: 'mqtt://localhost:1883',
    port: 1883,
    clientId: 'custom-mqtt-client'
  });
  protocolManager.registerAdapter(mqttAdapter);
  
  // 注册HTTP适配器
  const httpAdapter = new HTTPAdapter({
    enabled: true,
    port: 8080,
    host: '0.0.0.0'
  });
  protocolManager.registerAdapter(httpAdapter);
  
  // 注册UDP适配器
  const udpAdapter = new UDPAdapter({
    enabled: true,
    port: 9999,
    host: '0.0.0.0'
  });
  protocolManager.registerAdapter(udpAdapter);
  
  console.log('Custom adapters registered:', protocolManager.getRegisteredProtocols());
}

/**
 * 监听事件总线示例
 */
export function setupEventBusListeners(): void {
  // 监听所有消息
  eventBus.subscribeAll((message) => {
    console.log('Received message:', {
      type: message.type,
      deviceId: message.deviceId,
      tenantId: message.tenantId,
      protocol: message.protocol
    });
  });
  
  // 监听特定消息类型
  eventBus.subscribe(MessageType.TELEMETRY, (message) => {
    console.log('Telemetry data received:', message);
  });
  
  eventBus.subscribe(MessageType.STATUS_CHANGE, (message) => {
    console.log('Device status changed:', message);
  });
  
  eventBus.subscribe(MessageType.DEVICE_EVENT, (message) => {
    console.log('Device event occurred:', message);
  });
}

/**
 * 发送消息到设备示例
 */
export async function sendMessageToDevice(): Promise<void> {
  const protocolManager = ProtocolManager.getInstance();
  
  // 通过MQTT发送命令
  await protocolManager.sendToDevice(
    'tenant1',
    'device001',
    'sensor',
    MessageType.DEVICE_COMMAND,
    {
      command: 'reboot',
      parameters: { delay: 5 }
    },
    ProtocolType.MQTT
  );
  
  // 通过WebSocket发送配置
  await protocolManager.sendToDevice(
    'tenant1',
    'device002',
    'gateway',
    MessageType.SYSTEM_EVENT,
    {
      config: {
        sampling: { interval: 1000 },
        mqtt: { broker: 'mqtt://new-broker:1883' }
      }
    },
    ProtocolType.WEBSOCKET
  );
}

/**
 * 获取适配器状态示例
 */
export function getAdapterStatus(): void {
  const protocolManager = ProtocolManager.getInstance();
  
  // 获取所有适配器状态
  const allStatus = protocolManager.getAllAdapterStatus();
  console.log('All adapter status:', allStatus);
  
  // 获取特定适配器状态
  const mqttStatus = protocolManager.getAdapterStatus(ProtocolType.MQTT);
  console.log('MQTT adapter status:', mqttStatus);
  
  // 获取已注册的协议
  const protocols = protocolManager.getRegisteredProtocols();
  console.log('Registered protocols:', protocols);
}

/**
 * 完整的使用示例
 */
export async function completeExample(): Promise<void> {
  try {
    console.log('🚀 Starting protocol manager example...');
    
    // 1. 初始化协议管理器
    const protocolManager = await initializeProtocolManager();
    console.log('✅ Protocol manager initialized');
    
    // 2. 设置事件监听器
    setupEventBusListeners();
    console.log('✅ Event bus listeners setup');
    
    // 3. 获取状态信息
    getAdapterStatus();
    
    // 4. 发送测试消息
    await sendMessageToDevice();
    console.log('✅ Test messages sent');
    
    // 5. 等待一段时间让消息处理
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 6. 关闭协议管理器
    await protocolManager.shutdown();
    console.log('✅ Protocol manager shutdown');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// 如果直接运行此文件，执行完整示例
if (require.main === module) {
  completeExample();
}
