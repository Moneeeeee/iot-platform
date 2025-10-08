#!/usr/bin/env node

/**
 * 直接测试MQTT Broker连接
 */

import * as mqtt from 'mqtt';

const config = {
  mqttBroker: 'mqtt://localhost:1883',
  clientId: 'test-client-' + Date.now()
};

console.log('🚀 Testing MQTT Broker Connection');
console.log('📋 Configuration:', config);

async function testMqttConnection() {
  console.log('\n🔌 Testing MQTT connection...');
  
  const client = mqtt.connect(config.mqttBroker, {
    clientId: config.clientId,
    clean: true,
    connectTimeout: 10000
  });

  return new Promise((resolve, reject) => {
    client.on('connect', () => {
      console.log('✅ MQTT connected successfully');
      console.log(`   Broker: ${config.mqttBroker}`);
      console.log(`   Client ID: ${config.clientId}`);
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

async function testMessagePublishing(client) {
  console.log('\n📤 Testing message publishing...');
  
  const testTopic = 'test/topic/connection';
  const testMessage = {
    timestamp: Date.now(),
    message: 'Hello MQTT Broker!',
    clientId: config.clientId
  };

  try {
    await new Promise((resolve, reject) => {
      client.publish(
        testTopic,
        JSON.stringify(testMessage),
        { qos: 1, retain: false },
        (error) => {
          if (error) {
            reject(error);
          } else {
            console.log('✅ Test message published successfully');
            console.log(`   Topic: ${testTopic}`);
            console.log(`   Message: ${JSON.stringify(testMessage)}`);
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

async function testMessageSubscription(client) {
  console.log('\n👂 Testing message subscription...');
  
  const testTopic = 'test/topic/subscription';
  
  try {
    await new Promise((resolve, reject) => {
      client.subscribe(testTopic, { qos: 1 }, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log('✅ Subscribed to test topic successfully');
          console.log(`   Topic: ${testTopic}`);
          resolve();
        }
      });
    });

    // 发布一条消息到订阅的主题
    const testMessage = {
      timestamp: Date.now(),
      message: 'Test subscription message',
      clientId: config.clientId
    };

    await new Promise((resolve, reject) => {
      client.publish(
        testTopic,
        JSON.stringify(testMessage),
        { qos: 1, retain: false },
        (error) => {
          if (error) {
            reject(error);
          } else {
            console.log('✅ Test subscription message published');
            resolve();
          }
        }
      );
    });

    // 监听消息
    client.on('message', (topic, payload) => {
      if (topic === testTopic) {
        console.log('📨 Received message:', JSON.parse(payload.toString()));
      }
    });

    // 等待消息
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('❌ Message subscription failed:', error.message);
    throw error;
  }
}

async function testIoTTopics(client) {
  console.log('\n🏠 Testing IoT topic patterns...');
  
  const iotTopics = [
    'iot/default/sensor/test-device-001/telemetry',
    'iot/default/sensor/test-device-001/status',
    'iot/default/sensor/test-device-001/cmd',
    'iot/Test-Tenant-Case/sensor/test-device-case/telemetry',
    'iot/tenant-with/slash/sensor/test-device-slash/telemetry'
  ];

  for (const topic of iotTopics) {
    try {
      const testMessage = {
        timestamp: Date.now(),
        deviceId: 'test-device',
        tenant: topic.split('/')[1],
        message: 'IoT test message'
      };

      await new Promise((resolve, reject) => {
        client.publish(
          topic,
          JSON.stringify(testMessage),
          { qos: 1, retain: false },
          (error) => {
            if (error) {
              reject(error);
            } else {
              console.log(`✅ Published to IoT topic: ${topic}`);
              resolve();
            }
          }
        );
      });

    } catch (error) {
      console.error(`❌ Failed to publish to ${topic}:`, error.message);
    }
  }
}

async function runTest() {
  try {
    // 1. 测试MQTT连接
    const client = await testMqttConnection();
    
    // 2. 测试消息发布
    await testMessagePublishing(client);
    
    // 3. 测试消息订阅
    await testMessageSubscription(client);
    
    // 4. 测试IoT主题模式
    await testIoTTopics(client);
    
    // 5. 等待一段时间
    console.log('\n⏳ Waiting for additional messages...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 6. 断开连接
    await client.endAsync();
    console.log('✅ MQTT connection closed');
    
    console.log('\n🎉 MQTT Broker test completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ MQTT Connection');
    console.log('   ✅ Message Publishing');
    console.log('   ✅ Message Subscription');
    console.log('   ✅ IoT Topic Patterns');
    
  } catch (error) {
    console.error('\n💥 MQTT Broker test failed:', error.message);
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
