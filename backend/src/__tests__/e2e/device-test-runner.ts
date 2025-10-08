#!/usr/bin/env node

/**
 * 模拟设备测试和监控脚本
 * 
 * 这个脚本可以：
 * 1. 启动多个模拟设备
 * 2. 监控MQTT消息流
 * 3. 验证topic拼接、QoS策略、ACL等
 * 4. 测试各种边界情况
 * 5. 生成详细的测试报告
 */

import { MockIoTDevice, DeviceManager, DeviceConfig } from './mock-device.js';
import * as mqtt from 'mqtt';
import axios from 'axios';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// 测试配置
const TEST_CONFIG = {
  backend: {
    url: 'http://localhost:8000',
    bootstrapEndpoint: '/api/config/bootstrap'
  },
  mqtt: {
    broker: 'mqtt://localhost:1883',
    monitorClientId: 'test-monitor-' + Date.now()
  },
  test: {
    duration: 60000, // 1分钟测试
    deviceCount: 3,
    reportPath: './test-reports'
  }
};

// 测试结果接口
interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  details: any;
  timestamp: Date;
}

// 监控数据接口
interface MonitoringData {
  mqttMessages: Array<{
    timestamp: Date;
    topic: string;
    message: any;
    direction: 'in' | 'out';
  }>;
  deviceStatus: Array<{
    deviceId: string;
    online: boolean;
    messageCount: number;
    errorCount: number;
    lastSeen: Date;
  }>;
  testResults: TestResult[];
}

/**
 * 测试监控器
 */
class TestMonitor extends EventEmitter {
  private mqttClient: mqtt.MqttClient | null = null;
  private monitoringData: MonitoringData;
  private testResults: TestResult[] = [];
  private isMonitoring = false;

  constructor() {
    super();
    this.monitoringData = {
      mqttMessages: [],
      deviceStatus: [],
      testResults: []
    };
  }

  /**
   * 开始监控
   */
  async startMonitoring(): Promise<void> {
    console.log('🔍 Starting test monitoring...');
    
    // 连接到MQTT Broker进行监控
    this.mqttClient = mqtt.connect(TEST_CONFIG.mqtt.broker, {
      clientId: TEST_CONFIG.mqtt.monitorClientId,
      clean: true
    });

    this.mqttClient.on('connect', () => {
      console.log('✅ Monitor connected to MQTT Broker');
      this.isMonitoring = true;
      this.emit('monitoring-started');
    });

    this.mqttClient.on('message', (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString());
        this.recordMqttMessage(topic, message, 'in');
      } catch {
        this.recordMqttMessage(topic, payload.toString(), 'in');
      }
    });

    // 订阅所有iot主题进行监控
    this.mqttClient.subscribe('iot/+/+/+/+', { qos: 0 });
    this.mqttClient.subscribe('iot/+/+/+/+/+', { qos: 0 });
  }

  /**
   * 停止监控
   */
  async stopMonitoring(): Promise<void> {
    console.log('🛑 Stopping test monitoring...');
    
    this.isMonitoring = false;
    
    if (this.mqttClient) {
      await this.mqttClient.endAsync();
      this.mqttClient = null;
    }
    
    this.emit('monitoring-stopped');
  }

  /**
   * 记录MQTT消息
   */
  private recordMqttMessage(topic: string, message: any, direction: 'in' | 'out'): void {
    this.monitoringData.mqttMessages.push({
      timestamp: new Date(),
      topic,
      message,
      direction
    });

    console.log(`📨 MQTT ${direction.toUpperCase()}: ${topic}`);
    this.emit('mqtt-message', { topic, message, direction });
  }

  /**
   * 记录测试结果
   */
  recordTestResult(testName: string, success: boolean, details: any, error?: string): void {
    const result: TestResult = {
      testName,
      success,
      error,
      details,
      timestamp: new Date()
    };

    this.testResults.push(result);
    this.monitoringData.testResults.push(result);

    const status = success ? '✅' : '❌';
    console.log(`${status} Test: ${testName} - ${success ? 'PASSED' : 'FAILED'}`);
    
    if (error) {
      console.log(`   Error: ${error}`);
    }

    this.emit('test-result', result);
  }

  /**
   * 更新设备状态
   */
  updateDeviceStatus(deviceId: string, status: any): void {
    const existingIndex = this.monitoringData.deviceStatus.findIndex(d => d.deviceId === deviceId);
    const deviceStatus = {
      deviceId,
      online: status.online,
      messageCount: status.messageCount,
      errorCount: status.errorCount,
      lastSeen: status.lastSeen
    };

    if (existingIndex >= 0) {
      this.monitoringData.deviceStatus[existingIndex] = deviceStatus;
    } else {
      this.monitoringData.deviceStatus.push(deviceStatus);
    }

    this.emit('device-status-updated', deviceStatus);
  }

  /**
   * 生成测试报告
   */
  async generateReport(): Promise<string> {
    const report = {
      timestamp: new Date(),
      config: TEST_CONFIG,
      summary: {
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(r => r.success).length,
        failedTests: this.testResults.filter(r => !r.success).length,
        totalMqttMessages: this.monitoringData.mqttMessages.length,
        devicesMonitored: this.monitoringData.deviceStatus.length
      },
      testResults: this.testResults,
      mqttMessages: this.monitoringData.mqttMessages,
      deviceStatus: this.monitoringData.deviceStatus
    };

    const reportPath = path.join(TEST_CONFIG.test.reportPath, `test-report-${Date.now()}.json`);
    
    // 确保报告目录存在
    await fs.mkdir(TEST_CONFIG.test.reportPath, { recursive: true });
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Test report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * 获取监控数据
   */
  getMonitoringData(): MonitoringData {
    return this.monitoringData;
  }
}

/**
 * 测试场景
 */
class TestScenarios {
  constructor(
    private deviceManager: DeviceManager,
    private monitor: TestMonitor
  ) {}

  /**
   * 测试正常设备引导和连接
   */
  async testNormalDeviceBootstrap(): Promise<void> {
    console.log('🧪 Testing normal device bootstrap...');

    const deviceConfig: DeviceConfig = {
      deviceId: 'test-device-normal',
      mac: 'AA:BB:CC:DD:EE:FF',
      deviceType: 'sensor',
      firmware: {
        current: '1.0.0',
        build: '20240101.001',
        minRequired: '1.0.0',
        channel: 'stable'
      },
      hardware: {
        version: 'v1.0',
        serial: 'HW123456'
      },
      capabilities: [{ name: 'temperature' }],
      tenantId: 'default'
    };

    try {
      const device = this.deviceManager.createDevice(deviceConfig);
      await this.deviceManager.startDevice(deviceConfig.deviceId);

      // 等待设备连接和发送数据
      await new Promise(resolve => setTimeout(resolve, 5000));

      const status = device.getStatus();
      const mqttConfig = device.getMqttConfig();

      // 验证结果
      const success = status.online && mqttConfig !== null && status.messageCount > 0;
      
      this.monitor.recordTestResult(
        'Normal Device Bootstrap',
        success,
        {
          deviceId: deviceConfig.deviceId,
          online: status.online,
          messageCount: status.messageCount,
          errorCount: status.errorCount,
          mqttTopics: mqttConfig?.topics
        }
      );

      await this.deviceManager.stopDevice(deviceConfig.deviceId);
    } catch (error) {
      this.monitor.recordTestResult(
        'Normal Device Bootstrap',
        false,
        { deviceId: deviceConfig.deviceId },
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 测试大小写敏感的tenantId
   */
  async testCaseSensitiveTenantId(): Promise<void> {
    console.log('🧪 Testing case sensitive tenant ID...');

    const deviceConfig: DeviceConfig = {
      deviceId: 'test-device-case',
      mac: 'BB:CC:DD:EE:FF:00',
      deviceType: 'sensor',
      firmware: {
        current: '1.0.0',
        build: '20240101.002',
        minRequired: '1.0.0',
        channel: 'stable'
      },
      hardware: {
        version: 'v1.0',
        serial: 'HW789012'
      },
      capabilities: [{ name: 'humidity' }],
      tenantId: 'Test-Tenant-Case'
    };

    try {
      const device = this.deviceManager.createDevice(deviceConfig);
      await this.deviceManager.startDevice(deviceConfig.deviceId);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const mqttConfig = device.getMqttConfig();
      const status = device.getStatus();

      // 验证大小写保持
      const topicContainsCaseTenant = mqttConfig?.topics.telemetryPub.includes('Test-Tenant-Case') || false;
      const usernameContainsCaseTenant = mqttConfig?.username.includes('Test-Tenant-Case') || false;

      const success = status.online && topicContainsCaseTenant && usernameContainsCaseTenant;

      this.monitor.recordTestResult(
        'Case Sensitive Tenant ID',
        success,
        {
          deviceId: deviceConfig.deviceId,
          tenantId: deviceConfig.tenantId,
          topic: mqttConfig?.topics.telemetryPub,
          username: mqttConfig?.username,
          casePreserved: topicContainsCaseTenant && usernameContainsCaseTenant
        }
      );

      await this.deviceManager.stopDevice(deviceConfig.deviceId);
    } catch (error) {
      this.monitor.recordTestResult(
        'Case Sensitive Tenant ID',
        false,
        { deviceId: deviceConfig.deviceId, tenantId: deviceConfig.tenantId },
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 测试包含特殊字符的tenantId
   */
  async testSpecialCharacterTenantId(): Promise<void> {
    console.log('🧪 Testing special character tenant ID...');

    const deviceConfig: DeviceConfig = {
      deviceId: 'test-device-special',
      mac: 'CC:DD:EE:FF:00:11',
      deviceType: 'sensor',
      firmware: {
        current: '1.0.0',
        build: '20240101.003',
        minRequired: '1.0.0',
        channel: 'stable'
      },
      hardware: {
        version: 'v1.0',
        serial: 'HW345678'
      },
      capabilities: [{ name: 'pressure' }],
      tenantId: 'tenant-with/slash'
    };

    try {
      const device = this.deviceManager.createDevice(deviceConfig);
      await this.deviceManager.startDevice(deviceConfig.deviceId);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const mqttConfig = device.getMqttConfig();
      const status = device.getStatus();

      // 验证特殊字符处理
      const topicHandlesSpecialChars = mqttConfig?.topics.telemetryPub.includes('tenant-with') && 
                                     mqttConfig?.topics.telemetryPub.includes('slash');
      const noDoubleSlashes = !mqttConfig?.topics.telemetryPub.includes('//');

      const success = status.online && topicHandlesSpecialChars && noDoubleSlashes;

      this.monitor.recordTestResult(
        'Special Character Tenant ID',
        success,
        {
          deviceId: deviceConfig.deviceId,
          tenantId: deviceConfig.tenantId,
          topic: mqttConfig?.topics.telemetryPub,
          handlesSpecialChars: topicHandlesSpecialChars,
          noDoubleSlashes
        }
      );

      await this.deviceManager.stopDevice(deviceConfig.deviceId);
    } catch (error) {
      this.monitor.recordTestResult(
        'Special Character Tenant ID',
        false,
        { deviceId: deviceConfig.deviceId, tenantId: deviceConfig.tenantId },
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 测试QoS策略
   */
  async testQosPolicy(): Promise<void> {
    console.log('🧪 Testing QoS policy...');

    const deviceConfig: DeviceConfig = {
      deviceId: 'test-device-qos',
      mac: 'DD:EE:FF:00:11:22',
      deviceType: 'sensor',
      firmware: {
        current: '1.0.0',
        build: '20240101.004',
        minRequired: '1.0.0',
        channel: 'stable'
      },
      hardware: {
        version: 'v1.0',
        serial: 'HW901234'
      },
      capabilities: [{ name: 'low_power_mode' }], // 低功耗设备
      tenantId: 'default'
    };

    try {
      const device = this.deviceManager.createDevice(deviceConfig);
      await this.deviceManager.startDevice(deviceConfig.deviceId);

      await new Promise(resolve => setTimeout(resolve, 5000));

      const mqttConfig = device.getMqttConfig();
      const status = device.getStatus();

      // 验证QoS策略
      const telemetryPolicy = mqttConfig?.qosRetainPolicy.find(p => p.topic.includes('/telemetry'));
      const statusPolicy = mqttConfig?.qosRetainPolicy.find(p => p.topic.includes('/status'));

      const correctQosForLowPower = telemetryPolicy?.qos === 0; // 低功耗设备应该使用QoS 0
      const correctRetainForStatus = statusPolicy?.retain === true; // 状态消息应该retain

      const success = status.online && correctQosForLowPower && correctRetainForStatus;

      this.monitor.recordTestResult(
        'QoS Policy',
        success,
        {
          deviceId: deviceConfig.deviceId,
          telemetryQos: telemetryPolicy?.qos,
          statusRetain: statusPolicy?.retain,
          correctQosForLowPower,
          correctRetainForStatus
        }
      );

      await this.deviceManager.stopDevice(deviceConfig.deviceId);
    } catch (error) {
      this.monitor.recordTestResult(
        'QoS Policy',
        false,
        { deviceId: deviceConfig.deviceId },
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 测试多设备并发
   */
  async testConcurrentDevices(): Promise<void> {
    console.log('🧪 Testing concurrent devices...');

    const deviceConfigs: DeviceConfig[] = [
      {
        deviceId: 'concurrent-device-1',
        mac: '11:22:33:44:55:66',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0', channel: 'stable' },
        hardware: { version: 'v1.0', serial: 'HW001' },
        capabilities: [{ name: 'temperature' }],
        tenantId: 'default'
      },
      {
        deviceId: 'concurrent-device-2',
        mac: '22:33:44:55:66:77',
        deviceType: 'gateway',
        firmware: { current: '1.0.0', build: '002', minRequired: '1.0.0', channel: 'stable' },
        hardware: { version: 'v1.0', serial: 'HW002' },
        capabilities: [{ name: 'subdevice_support' }],
        tenantId: 'default'
      },
      {
        deviceId: 'concurrent-device-3',
        mac: '33:44:55:66:77:88',
        deviceType: 'sensor',
        firmware: { current: '1.0.0', build: '003', minRequired: '1.0.0', channel: 'stable' },
        hardware: { version: 'v1.0', serial: 'HW003' },
        capabilities: [{ name: 'humidity' }],
        tenantId: 'default'
      }
    ];

    try {
      // 创建所有设备
      const devices = deviceConfigs.map(config => this.deviceManager.createDevice(config));

      // 并发启动所有设备
      await Promise.all(deviceConfigs.map(config => this.deviceManager.startDevice(config.deviceId)));

      // 等待所有设备稳定
      await new Promise(resolve => setTimeout(resolve, 10000));

      // 检查所有设备状态
      const allDevicesOnline = devices.every(device => device.isDeviceConnected());
      const totalMessages = devices.reduce((sum, device) => sum + device.getStatus().messageCount, 0);
      const totalErrors = devices.reduce((sum, device) => sum + device.getStatus().errorCount, 0);

      const success = allDevicesOnline && totalMessages > 0 && totalErrors === 0;

      this.monitor.recordTestResult(
        'Concurrent Devices',
        success,
        {
          deviceCount: deviceConfigs.length,
          allOnline: allDevicesOnline,
          totalMessages,
          totalErrors,
          deviceStatuses: devices.map(device => ({
            deviceId: device.getStatus().deviceId || 'unknown',
            online: device.isDeviceConnected(),
            messageCount: device.getStatus().messageCount,
            errorCount: device.getStatus().errorCount
          }))
        }
      );

      // 停止所有设备
      await Promise.all(deviceConfigs.map(config => this.deviceManager.stopDevice(config.deviceId)));
    } catch (error) {
      this.monitor.recordTestResult(
        'Concurrent Devices',
        false,
        { deviceCount: deviceConfigs.length },
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

/**
 * 主测试运行器
 */
class TestRunner {
  private deviceManager: DeviceManager;
  private monitor: TestMonitor;
  private scenarios: TestScenarios;

  constructor() {
    this.deviceManager = new DeviceManager();
    this.monitor = new TestMonitor();
    this.scenarios = new TestScenarios(this.deviceManager, this.monitor);
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive MQTT device tests...');
    console.log(`📋 Test configuration:`, TEST_CONFIG);

    try {
      // 1. 启动监控
      await this.monitor.startMonitoring();

      // 2. 运行测试场景
      console.log('\n📝 Running test scenarios...');
      
      await this.scenarios.testNormalDeviceBootstrap();
      await this.scenarios.testCaseSensitiveTenantId();
      await this.scenarios.testSpecialCharacterTenantId();
      await this.scenarios.testQosPolicy();
      await this.scenarios.testConcurrentDevices();

      // 3. 等待一段时间收集更多数据
      console.log('\n⏳ Collecting additional monitoring data...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // 4. 生成报告
      console.log('\n📊 Generating test report...');
      const reportPath = await this.monitor.generateReport();

      // 5. 显示测试摘要
      this.showTestSummary();

      console.log(`\n✅ All tests completed! Report saved to: ${reportPath}`);

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    } finally {
      // 清理资源
      await this.cleanup();
    }
  }

  /**
   * 显示测试摘要
   */
  private showTestSummary(): void {
    const results = this.monitor.getMonitoringData().testResults;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    console.log('\n📈 Test Summary:');
    console.log(`   Total Tests: ${total}`);
    console.log(`   Passed: ${passed} ✅`);
    console.log(`   Failed: ${failed} ❌`);
    console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.testName}: ${result.error || 'Unknown error'}`);
      });
    }
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up resources...');
    
    try {
      await this.deviceManager.stopAllDevices();
      await this.monitor.stopMonitoring();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('⚠️ Cleanup error:', error);
    }
  }
}

// 主程序入口
async function main() {
  const runner = new TestRunner();
  
  try {
    await runner.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// 处理中断信号
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Test terminated');
  process.exit(143);
});

// 运行主程序
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TestRunner, TestMonitor, TestScenarios };
