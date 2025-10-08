#!/usr/bin/env node

/**
 * 简单的MQTT测试 - 通过Docker网络连接
 */

import * as mqtt from 'mqtt';

// 使用Docker网络中的EMQX服务名
const config = {
  mqttBroker: 'mqtt://iot-emqx:1883', // 使用Docker服务名
  clientId: 'test-device-' + Date.now()
};

console.log('🚀 简单MQTT测试');
console.log('📋 配置:', config);

async function testConnection() {
  console.log('\n🔌 测试MQTT连接...');
  
  const client = mqtt.connect(config.mqttBroker, {
    clientId: config.clientId,
    clean: true,
    connectTimeout: 5000
  });

  return new Promise((resolve, reject) => {
    client.on('connect', () => {
      console.log('✅ MQTT连接成功!');
      resolve(client);
    });

    client.on('error', (error) => {
      console.error('❌ MQTT连接失败:', error.message);
      reject(error);
    });

    setTimeout(() => {
      if (!client.connected) {
        reject(new Error('连接超时'));
      }
    }, 5000);
  });
}

async function testPublish(client) {
  console.log('\n📤 测试消息发布...');
  
  const topic = 'iot/default/sensor/test-device/telemetry';
  const message = {
    timestamp: Date.now(),
    deviceId: 'test-device',
    temperature: 25.5,
    humidity: 60.2
  };

  return new Promise((resolve, reject) => {
    client.publish(topic, JSON.stringify(message), { qos: 1 }, (error) => {
      if (error) {
        reject(error);
      } else {
        console.log('✅ 消息发布成功!');
        console.log(`   主题: ${topic}`);
        console.log(`   消息: ${JSON.stringify(message)}`);
        resolve();
      }
    });
  });
}

async function testSubscribe(client) {
  console.log('\n👂 测试消息订阅...');
  
  const topic = 'iot/default/sensor/test-device/cmd';
  
  return new Promise((resolve, reject) => {
    client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        reject(error);
      } else {
        console.log('✅ 订阅成功!');
        console.log(`   主题: ${topic}`);
        
        // 监听消息
        client.on('message', (receivedTopic, payload) => {
          if (receivedTopic === topic) {
            console.log('📨 收到消息:', JSON.parse(payload.toString()));
          }
        });
        
        resolve();
      }
    });
  });
}

async function runTest() {
  try {
    const client = await testConnection();
    await testPublish(client);
    await testSubscribe(client);
    
    console.log('\n⏳ 等待3秒...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await client.endAsync();
    console.log('✅ 连接已关闭');
    
    console.log('\n🎉 测试完成!');
    
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
    process.exit(1);
  }
}

runTest();
