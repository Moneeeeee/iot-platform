#!/usr/bin/env node

/**
 * 模拟设备测试运行脚本
 * 
 * 使用方法:
 *   node run-device-tests.js [options]
 * 
 * 选项:
 *   --backend-url <url>     后端服务URL (默认: http://localhost:8000)
 *   --mqtt-broker <url>     MQTT Broker URL (默认: mqtt://localhost:1883)
 *   --duration <ms>         测试持续时间 (默认: 60000ms)
 *   --device-count <count>  设备数量 (默认: 3)
 *   --report-dir <dir>      报告目录 (默认: ./test-reports)
 *   --help                  显示帮助信息
 */

import { TestRunner } from './device-test-runner.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    backendUrl: 'http://localhost:8000',
    mqttBroker: 'mqtt://localhost:1883',
    duration: 60000,
    deviceCount: 3,
    reportDir: './test-reports'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--backend-url':
        config.backendUrl = args[++i];
        break;
      case '--mqtt-broker':
        config.mqttBroker = args[++i];
        break;
      case '--duration':
        config.duration = parseInt(args[++i]);
        break;
      case '--device-count':
        config.deviceCount = parseInt(args[++i]);
        break;
      case '--report-dir':
        config.reportDir = args[++i];
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        showHelp();
        process.exit(1);
    }
  }

  return config;
}

function showHelp() {
  console.log(`
模拟设备测试运行脚本

使用方法:
  node run-device-tests.js [options]

选项:
  --backend-url <url>     后端服务URL (默认: http://localhost:8000)
  --mqtt-broker <url>     MQTT Broker URL (默认: mqtt://localhost:1883)
  --duration <ms>         测试持续时间 (默认: 60000ms)
  --device-count <count>  设备数量 (默认: 3)
  --report-dir <dir>      报告目录 (默认: ./test-reports)
  --help                  显示帮助信息

示例:
  node run-device-tests.js
  node run-device-tests.js --backend-url http://localhost:3000 --mqtt-broker mqtt://localhost:1884
  node run-device-tests.js --duration 120000 --device-count 5
`);
}

async function main() {
  const config = parseArgs();
  
  console.log('🚀 Starting Mock Device Tests');
  console.log('📋 Configuration:');
  console.log(`   Backend URL: ${config.backendUrl}`);
  console.log(`   MQTT Broker: ${config.mqttBroker}`);
  console.log(`   Duration: ${config.duration}ms`);
  console.log(`   Device Count: ${config.deviceCount}`);
  console.log(`   Report Directory: ${config.reportDir}`);
  console.log('');

  // 更新全局配置
  global.TEST_CONFIG = {
    backend: {
      url: config.backendUrl,
      bootstrapEndpoint: '/api/config/bootstrap'
    },
    mqtt: {
      broker: config.mqttBroker,
      monitorClientId: 'test-monitor-' + Date.now()
    },
    test: {
      duration: config.duration,
      deviceCount: config.deviceCount,
      reportPath: config.reportDir
    }
  };

  const runner = new TestRunner();
  
  try {
    await runner.runAllTests();
    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }
}

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(143);
});

// 运行主程序
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
