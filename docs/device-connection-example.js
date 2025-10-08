/**
 * IoT设备连接示例
 * 
 * 演示设备如何连接到IoT平台服务器
 */

const axios = require('axios');
const mqtt = require('mqtt');

class IoTDevice {
  constructor(deviceId, mac, deviceType, tenantId) {
    this.deviceId = deviceId;
    this.mac = mac;
    this.deviceType = deviceType;
    this.tenantId = tenantId;
    this.serverUrl = 'http://localhost:8000';
    this.mqttClient = null;
    this.config = null;
  }

  /**
   * 步骤1: 发送引导请求
   */
  async bootstrap() {
    try {
      console.log('🚀 发送设备引导请求...');
      
      const bootstrapRequest = {
        deviceId: this.deviceId,
        mac: this.mac,
        firmware: {
          current: '1.0.0',
          build: '001',
          minRequired: '1.0.0',
          channel: 'stable'
        },
        hardware: {
          version: 'v1.0',
          serial: `HW-${this.deviceId}`,
          description: `${this.deviceType} Device`
        },
        capabilities: [
          { name: 'temperature_sensor', version: '1.0' },
          { name: 'low_power_mode', version: '1.0' }
        ],
        deviceType: this.deviceType,
        tenantId: this.tenantId,
        timestamp: Date.now()
      };

      const response = await axios.post(
        `${this.serverUrl}/api/config/bootstrap`,
        bootstrapRequest,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        this.config = response.data.data;
        console.log('✅ 引导配置获取成功');
        console.log('📋 MQTT配置:', {
          broker: this.config.mqtt.brokers[0].url,
          clientId: this.config.mqtt.clientId,
          username: this.config.mqtt.username
        });
        return true;
      } else {
        throw new Error('引导请求失败');
      }
    } catch (error) {
      console.error('❌ 引导请求失败:', error.message);
      return false;
    }
  }

  /**
   * 步骤2: 建立MQTT连接
   */
  async connectMQTT() {
    if (!this.config) {
      throw new Error('请先执行引导请求');
    }

    try {
      console.log('🔗 建立MQTT连接...');
      
      const mqttConfig = this.config.mqtt;
      
      this.mqttClient = mqtt.connect(mqttConfig.brokers[0].url, {
        clientId: mqttConfig.clientId,
        username: mqttConfig.username,
        password: mqttConfig.password,
        keepalive: mqttConfig.keepalive,
        clean: true
      });

      this.mqttClient.on('connect', () => {
        console.log('✅ MQTT连接成功');
        this.subscribeToTopics();
        this.publishDeviceStatus();
      });

      this.mqttClient.on('error', (error) => {
        console.error('❌ MQTT连接错误:', error);
      });

      this.mqttClient.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      return new Promise((resolve, reject) => {
        this.mqttClient.on('connect', resolve);
        this.mqttClient.on('error', reject);
      });

    } catch (error) {
      console.error('❌ MQTT连接失败:', error.message);
      throw error;
    }
  }

  /**
   * 步骤3: 订阅主题
   */
  subscribeToTopics() {
    const topics = this.config.mqtt.topics;
    
    // 订阅命令主题
    this.mqttClient.subscribe(topics.cmdSub, (err) => {
      if (!err) {
        console.log(`📥 已订阅命令主题: ${topics.cmdSub}`);
      }
    });

    // 订阅影子期望状态主题
    this.mqttClient.subscribe(topics.shadowDesiredSub, (err) => {
      if (!err) {
        console.log(`📥 已订阅影子主题: ${topics.shadowDesiredSub}`);
      }
    });

    // 订阅配置主题
    this.mqttClient.subscribe(topics.cfgSub, (err) => {
      if (!err) {
        console.log(`📥 已订阅配置主题: ${topics.cfgSub}`);
      }
    });
  }

  /**
   * 步骤4: 发布设备状态
   */
  publishDeviceStatus() {
    const statusMessage = {
      online: true,
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      firmware: '1.0.0'
    };

    this.mqttClient.publish(
      this.config.mqtt.topics.statusPub,
      JSON.stringify(statusMessage),
      { qos: 1, retain: true },
      (err) => {
        if (!err) {
          console.log('📤 设备状态已发布');
        }
      }
    );
  }

  /**
   * 步骤5: 处理接收到的消息
   */
  handleMessage(topic, message) {
    const topics = this.config.mqtt.topics;
    
    try {
      const data = JSON.parse(message.toString());
      
      if (topic === topics.cmdSub) {
        console.log('📨 收到命令:', data);
        this.executeCommand(data);
      } else if (topic === topics.shadowDesiredSub) {
        console.log('📨 收到影子期望状态:', data);
        this.updateShadowDesired(data);
      } else if (topic === topics.cfgSub) {
        console.log('📨 收到配置更新:', data);
        this.updateConfig(data);
      }
    } catch (error) {
      console.error('❌ 消息解析失败:', error);
    }
  }

  /**
   * 执行命令
   */
  executeCommand(command) {
    console.log(`🔧 执行命令: ${command.action}`);
    
    // 模拟命令执行
    switch (command.action) {
      case 'restart':
        console.log('🔄 设备重启中...');
        break;
      case 'get_status':
        this.publishDeviceStatus();
        break;
      case 'set_interval':
        console.log(`⏰ 设置遥测间隔: ${command.interval}ms`);
        break;
      default:
        console.log('❓ 未知命令:', command.action);
    }
  }

  /**
   * 更新影子期望状态
   */
  updateShadowDesired(shadowData) {
    console.log('🔄 更新设备配置...');
    
    // 发布影子报告状态
    const reportedState = {
      ...shadowData,
      timestamp: new Date().toISOString()
    };

    this.mqttClient.publish(
      this.config.mqtt.topics.shadowReportedPub,
      JSON.stringify(reportedState),
      { qos: 1, retain: false }
    );
  }

  /**
   * 更新配置
   */
  updateConfig(configData) {
    console.log('⚙️ 应用新配置:', configData);
  }

  /**
   * 发布遥测数据
   */
  publishTelemetry(data) {
    const telemetryMessage = {
      ...data,
      deviceId: this.deviceId,
      timestamp: new Date().toISOString()
    };

    this.mqttClient.publish(
      this.config.mqtt.topics.telemetryPub,
      JSON.stringify(telemetryMessage),
      { qos: 1, retain: false },
      (err) => {
        if (!err) {
          console.log('📊 遥测数据已发布');
        }
      }
    );
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.mqttClient) {
      console.log('🔌 断开MQTT连接...');
      this.mqttClient.end();
    }
  }
}

// 使用示例
async function main() {
  console.log('🚀 IoT设备连接示例');
  
  // 创建设备实例
  const device = new IoTDevice(
    'sensor-001',
    'AA:BB:CC:DD:EE:FF',
    'sensor',
    'tenant-001'
  );

  try {
    // 步骤1: 引导请求
    const bootstrapSuccess = await device.bootstrap();
    if (!bootstrapSuccess) {
      return;
    }

    // 步骤2: 建立MQTT连接
    await device.connectMQTT();

    // 步骤3: 模拟发送遥测数据
    console.log('📊 开始发送遥测数据...');
    
    setInterval(() => {
      const telemetryData = {
        temperature: Math.random() * 30 + 10, // 10-40度
        humidity: Math.random() * 40 + 30,    // 30-70%
        battery: Math.random() * 20 + 80       // 80-100%
      };
      
      device.publishTelemetry(telemetryData);
    }, 30000); // 每30秒发送一次

    // 保持连接
    console.log('✅ 设备已成功连接并运行');
    console.log('按 Ctrl+C 退出');

  } catch (error) {
    console.error('❌ 设备连接失败:', error.message);
  }
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n👋 正在退出...');
  process.exit(0);
});

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

module.exports = IoTDevice;
