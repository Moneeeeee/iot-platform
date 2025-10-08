#!/usr/bin/env node

/**
 * 简化的模拟设备测试脚本 - 使用Node.js内置模块
 */

import * as mqtt from 'mqtt';
import http from 'http';
import { promisify } from 'util';

// 测试配置
const config = {
  backendUrl: 'http://localhost:8000',
  mqttBroker: 'mqtt://localhost:1883',
  deviceId: 'test-device-' + Date.now(),
  tenantId: 'default'
};

console.log('🚀 Starting Mock Device Test');
console.log('📋 Configuration:', config);

// HTTP请求辅助函数
function makeHttpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testBootstrap() {
  console.log('\n📡 Testing device bootstrap...');
  
  const bootstrapRequest = {
    deviceId: config.deviceId,
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
    tenantId: config.tenantId,
    timestamp: Date.now()
  };

  const url = new URL(`${config.backendUrl}/api/config/bootstrap`);
  const options = {
    hostname: url.hostname,
    port: url.port || 8000,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': config.tenantId
    }
  };

  try {
    const response = await makeHttpRequest(options, bootstrapRequest);

    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ Bootstrap successful');
      console.log('📋 MQTT Config:', JSON.stringify(response.data.data.mqtt, null, 2));
      return response.data.data.mqtt;
    } else {
      throw new Error(`Bootstrap failed: ${response.data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Bootstrap failed:', error.message);
    throw error;
  }
}

async function testMqttConnection(mqttConfig) {
  console.log('\n🔌 Testing MQTT connection...');
  
  const client = mqtt.connect(config.mqttBroker, {
    username: mqttConfig.username,
    password: mqttConfig.password,
    clientId: mqttConfig.clientId,
    clean: true,
    connectTimeout: 10000
  });

  return new Promise((resolve, reject) => {
    client.on('connect', () => {
      console.log('✅ MQTT connected successfully');
      resolve(client);
    });

    client.on('error', (error) => {
      console.error('❌ MQTT connection error:', error.message);
      reject(error);
    });

    // 超时处理
    setTimeout(() => {
      if (!client.connected) {
        reject(new Error('MQTT connection timeout'));
      }
    }, 10000);
  });
}

async function testMessagePublishing(client, mqttConfig) {
  console.log('\n📤 Testing message publishing...');
  
  // 测试发送状态消息
  const statusData = {
    ts: Date.now(),
    msgId: 'test-status-001',
    deviceId: config.deviceId,
    tenant: config.tenantId,
    ver: '1',
    online: true,
    battery: 85,
    rssi: -45,
    temperature: 23.5,
    humidity: 60.2
  };

  try {
    await new Promise((resolve, reject) => {
      client.publish(
        mqttConfig.topics.statusPub,
        JSON.stringify(statusData),
        { qos: 1, retain: true },
        (error) => {
          if (error) {
            reject(error);
          } else {
            console.log('✅ Status message published successfully');
            console.log(`   Topic: ${mqttConfig.topics.statusPub}`);
            console.log(`   Data: ${JSON.stringify(statusData)}`);
            resolve();
          }
        }
      );
    });

    // 测试发送遥测数据
    const telemetryData = {
      ts: Date.now(),
      msgId: 'test-telemetry-001',
      deviceId: config.deviceId,
      tenant: config.tenantId,
      ver: '1',
      metrics: {
        temperature: 24.1,
        humidity: 58.7,
        pressure: 1013.25,
        light: 450
      },
      mode: 'periodic'
    };

    await new Promise((resolve, reject) => {
      client.publish(
        mqttConfig.topics.telemetryPub,
        JSON.stringify(telemetryData),
        { qos: 1, retain: false },
        (error) => {
          if (error) {
            reject(error);
          } else {
            console.log('✅ Telemetry message published successfully');
            console.log(`   Topic: ${mqttConfig.topics.telemetryPub}`);
            console.log(`   Data: ${JSON.stringify(telemetryData)}`);
            resolve();
          }
        }
      );
    });

  } catch (error) {
    console.error('❌ Message publishing failed:', error.message);
    throw error;
  }
}

async function testMessageSubscription(client, mqttConfig) {
  console.log('\n👂 Testing message subscription...');
  
  try {
    await new Promise((resolve, reject) => {
      client.subscribe(mqttConfig.topics.cmdSub, { qos: 1 }, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log('✅ Subscribed to commands successfully');
          console.log(`   Topic: ${mqttConfig.topics.cmdSub}`);
          resolve();
        }
      });
    });

    // 监听消息
    client.on('message', (topic, payload) => {
      if (topic === mqttConfig.topics.cmdSub) {
        console.log('📨 Received command:', JSON.parse(payload.toString()));
      }
    });

    // 等待一段时间看是否有消息
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error('❌ Message subscription failed:', error.message);
    throw error;
  }
}

async function testTopicValidation(mqttConfig) {
  console.log('\n🔍 Testing topic validation...');
  
  // 验证topic格式
  const topics = mqttConfig.topics;
  
  console.log('📋 Topic Analysis:');
  console.log(`   Telemetry: ${topics.telemetryPub}`);
  console.log(`   Status: ${topics.statusPub}`);
  console.log(`   Commands: ${topics.cmdSub}`);
  
  // 检查tenantId是否正确包含在topic中
  const tenantInTopic = topics.telemetryPub.includes(config.tenantId);
  console.log(`   Tenant ID in topic: ${tenantInTopic ? '✅' : '❌'}`);
  
  // 检查设备ID是否正确包含在topic中
  const deviceInTopic = topics.telemetryPub.includes(config.deviceId);
  console.log(`   Device ID in topic: ${deviceInTopic ? '✅' : '❌'}`);
  
  // 检查是否有双斜杠
  const hasDoubleSlash = topics.telemetryPub.includes('//');
  console.log(`   No double slashes: ${!hasDoubleSlash ? '✅' : '❌'}`);
  
  return { tenantInTopic, deviceInTopic, hasDoubleSlash };
}

async function runTest() {
  try {
    // 1. 测试引导
    const mqttConfig = await testBootstrap();
    
    // 2. 测试topic验证
    const validation = await testTopicValidation(mqttConfig);
    
    // 3. 测试MQTT连接
    const client = await testMqttConnection(mqttConfig);
    
    // 4. 测试消息发布
    await testMessagePublishing(client, mqttConfig);
    
    // 5. 测试消息订阅
    await testMessageSubscription(client, mqttConfig);
    
    // 6. 等待一段时间观察
    console.log('\n⏳ Waiting for additional messages...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 7. 断开连接
    await client.endAsync();
    console.log('✅ MQTT connection closed');
    
    // 8. 显示测试结果
    console.log('\n📊 Test Results:');
    console.log(`   Bootstrap: ✅`);
    console.log(`   Topic Validation: ${validation.tenantInTopic && validation.deviceInTopic && !validation.hasDoubleSlash ? '✅' : '❌'}`);
    console.log(`   MQTT Connection: ✅`);
    console.log(`   Message Publishing: ✅`);
    console.log(`   Message Subscription: ✅`);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(130);
});

// 运行测试
runTest();