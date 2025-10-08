/**
 * Jest 测试设置文件
 * 
 * 在运行测试之前进行全局设置
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载测试环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// 设置测试环境变量
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'] || 'postgresql://iot:iotpw@localhost:5433/iotdb_test';
process.env['REDIS_URL'] = process.env['TEST_REDIS_URL'] || 'redis://localhost:6380/1';
process.env['MQTT_BROKER_URL'] = process.env['TEST_MQTT_BROKER'] || 'mqtt://localhost:1884';
process.env['JWT_SECRET'] = 'test-jwt-secret-key-for-testing-only';

// 全局测试超时
jest.setTimeout(30000);

// 抑制控制台输出（可选）
if (process.env['SUPPRESS_TEST_LOGS'] === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// 测试后清理
afterAll(async () => {
  // 等待所有异步操作完成
  await new Promise(resolve => setTimeout(resolve, 1000));
});
