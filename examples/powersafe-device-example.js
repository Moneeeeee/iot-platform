#!/usr/bin/env node

/**
 * PowerSafe 设备示例
 * 独立于平台，展示如何集成PowerSafe设备
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const BOOTSTRAP_ENDPOINT = `${API_BASE_URL}/api/config/bootstrap`;

/**
 * PowerSafe 设备引导请求示例
 */
const POWERSAFE_BOOTSTRAP_REQUEST = {
  // 设备基本信息
  deviceId: 'powersafe-001',
  mac: '00:11:22:33:44:55',
  deviceType: 'ps-ctrl',
  tenantId: 'default',
  
  // 硬件信息
  hardware: {
    version: 'PowerSafe-v1.0',
    serialNumber: 'PS2024001',
    manufacturer: 'PowerSafe Technologies'
  },
  
  // 固件信息
  firmware: {
    version: '1.0.0',
    buildNumber: '20241208-001',
    channel: 'stable'
  },
  
  // 设备能力（PowerSafe特定）
  capabilities: [
    // 传感器能力
    {
      name: 'sht40_onboard',
      version: '1.0.0',
      params: {
        type: 'temperature_humidity',
        precision: { temperature: 0.1, humidity: 0.1 },
        range: { temperature: [-40, 125], humidity: [0, 100] }
      }
    },
    {
      name: 'sht31_external',
      version: '1.0.0',
      params: {
        type: 'temperature_humidity',
        precision: { temperature: 0.1, humidity: 0.1 },
        range: { temperature: [-40, 125], humidity: [0, 100] }
      }
    },
    {
      name: 'flame_detector',
      version: '1.0.0',
      params: {
        type: 'analog_flame',
        precision: 0.01,
        range: [0, 4095],
        threshold: { normal: 100, warning: 500, danger: 1000 }
      }
    },
    {
      name: 'ags10_gas_quality',
      version: '1.0.0',
      params: {
        type: 'gas_quality',
        precision: 0.1,
        range: [0, 1000],
        threshold: { excellent: 50, good: 100, moderate: 200, poor: 500, hazardous: 1000 }
      }
    },
    {
      name: 'battery_voltage',
      version: '1.0.0',
      params: {
        type: 'voltage',
        precision: 0.01,
        range: [0, 5],
        threshold: { low: 3.0, critical: 2.5 }
      }
    },
    
    // 控制能力
    {
      name: 'solenoid_valves',
      version: '1.0.0',
      params: {
        type: 'digital_output',
        count: 3,
        valves: [
          { id: 'valve_1', name: '主阀', description: '主要控制阀' },
          { id: 'valve_2', name: '辅助阀1', description: '辅助控制阀1' },
          { id: 'valve_3', name: '辅助阀2', description: '辅助控制阀2' }
        ]
      }
    },
    
    // 通信能力
    {
      name: 'esp32s3_wifi',
      version: '1.0.0',
      params: {
        type: 'wifi',
        bands: ['2.4GHz'],
        protocols: ['TCP', 'UDP', 'MQTT', 'HTTP', 'HTTPS']
      }
    },
    {
      name: 'ec801e_4g',
      version: '1.0.0',
      params: {
        type: 'cellular',
        bands: ['B1', 'B3', 'B5', 'B8', 'B20', 'B28'],
        protocols: ['TCP', 'UDP', 'MQTT', 'HTTP', 'HTTPS']
      }
    },
    
    // 系统能力
    {
      name: 'ota_support',
      version: '1.0.0',
      params: {
        type: 'firmware_update',
        methods: ['http', 'mqtt']
      }
    },
    {
      name: 'shadow_support',
      version: '1.0.0',
      params: {
        type: 'device_shadow',
        features: ['desired_state', 'reported_state', 'delta_processing']
      }
    },
    {
      name: 'low_power_mode',
      version: '1.0.0',
      params: {
        type: 'power_management',
        modes: ['active', 'sleep', 'deep_sleep']
      }
    }
  ],
  
  // 请求时间戳
  timestamp: Date.now(),
  
  // 消息ID（用于幂等性）
  messageId: `powersafe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // 请求签名（可选）
  signature: ''
};

/**
 * 发送引导请求
 */
async function sendBootstrapRequest(requestData) {
  console.log('🔋 PowerSafe 设备引导请求');
  console.log('📤 发送到:', BOOTSTRAP_ENDPOINT);
  console.log('📤 请求数据:', JSON.stringify(requestData, null, 2));
  
  try {
    const response = await fetch(BOOTSTRAP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Message-Id': requestData.messageId
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    
    console.log('📥 响应状态:', response.status);
    console.log('📥 响应数据:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('✅ PowerSafe 设备引导成功');
      
      // 显示关键配置信息
      if (result.data && result.data.mqtt) {
        console.log('\n🔗 MQTT配置:');
        console.log(`   Broker: ${result.data.mqtt.broker}`);
        console.log(`   遥测主题: ${result.data.mqtt.topics.telemetry}`);
        console.log(`   命令主题: ${result.data.mqtt.topics.cmd}`);
        console.log(`   状态主题: ${result.data.mqtt.topics.status}`);
      }
      
      if (result.data && result.data.device) {
        console.log('\n📱 设备配置:');
        console.log(`   设备ID: ${result.data.device.id}`);
        console.log(`   设备类型: ${result.data.device.type}`);
        console.log(`   能力数量: ${result.data.device.capabilities?.length || 0}`);
      }
      
      return result.data;
    } else {
      throw new Error(`引导失败: ${result.message || '未知错误'}`);
    }
    
  } catch (error) {
    console.error('❌ PowerSafe 设备引导失败:', error);
    throw error;
  }
}

/**
 * 显示PowerSafe设备信息
 */
function showPowerSafeInfo() {
  console.log('🔋 PowerSafe 设备信息');
  console.log('=' .repeat(50));
  console.log('硬件配置:');
  console.log('  - ESP32-S3 主控芯片');
  console.log('  - 4G模块 EC801E');
  console.log('  - 板载温湿度传感器 SHT40');
  console.log('  - 外接温湿度传感器 SHT31');
  console.log('  - 火焰探头（模拟量）');
  console.log('  - 气体质量传感器 AGS10');
  console.log('  - 3个电磁阀');
  console.log('  - 锂电池供电');
  console.log('');
  console.log('设备类型: ps-ctrl');
  console.log('支持能力: 传感器监测、电磁阀控制、4G/WiFi通信、OTA升级');
  console.log('');
}

/**
 * 主函数
 */
async function main() {
  showPowerSafeInfo();
  
  try {
    const config = await sendBootstrapRequest(POWERSAFE_BOOTSTRAP_REQUEST);
    
    console.log('\n🎉 PowerSafe 设备集成完成！');
    console.log('\n📋 后续步骤:');
    console.log('1. 使用MQTT客户端连接并发送遥测数据');
    console.log('2. 测试电磁阀控制命令');
    console.log('3. 测试设备影子功能');
    console.log('4. 测试OTA升级功能');
    console.log('5. 测试低功耗模式');
    
  } catch (error) {
    console.error('\n❌ PowerSafe 设备集成失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { sendBootstrapRequest, POWERSAFE_BOOTSTRAP_REQUEST };

