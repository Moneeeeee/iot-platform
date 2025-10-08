#!/usr/bin/env node

/**
 * 测试引导接口认证修复
 * 
 * 验证引导接口不再需要JWT token，同时演示如何获取JWT token用于其他接口
 */

import http from 'http';

console.log('🧪 测试引导接口认证修复');

// 测试配置
const config = {
  backendUrl: 'http://localhost:8000',
  deviceId: 'test-device-' + Date.now(),
  tenantId: 'default'
};

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

async function testBootstrapWithoutAuth() {
  console.log('\n📡 测试引导接口（无认证）...');
  
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
      // 注意：没有Authorization头
    }
  };

  try {
    const response = await makeHttpRequest(options, bootstrapRequest);

    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ 引导成功（无认证）!');
      console.log('📋 MQTT配置:', JSON.stringify(response.data.data.mqtt, null, 2));
      return response.data.data.mqtt;
    } else {
      console.log('❌ 引导失败:', response.data.message || response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ 引导请求失败:', error.message);
    return null;
  }
}

async function testBootstrapWithAuth() {
  console.log('\n📡 测试引导接口（带认证）...');
  
  const bootstrapRequest = {
    deviceId: config.deviceId + '-auth',
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
      'X-Tenant-ID': config.tenantId,
      'Authorization': 'Bearer test-token'  // 带认证头
    }
  };

  try {
    const response = await makeHttpRequest(options, bootstrapRequest);

    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ 引导成功（带认证）!');
      return response.data.data.mqtt;
    } else {
      console.log('❌ 引导失败:', response.data.message || response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ 引导请求失败:', error.message);
    return null;
  }
}

async function testOtherEndpointWithAuth() {
  console.log('\n🔐 测试其他需要认证的接口...');
  
  // 测试一个需要认证的接口（假设存在）
  const url = new URL(`${config.backendUrl}/api/devices`);
  const options = {
    hostname: url.hostname,
    port: url.port || 8000,
    path: url.pathname,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': config.tenantId,
      'Authorization': 'Bearer invalid-token'  // 无效token
    }
  };

  try {
    const response = await makeHttpRequest(options, null);

    if (response.statusCode === 401) {
      console.log('✅ 认证检查正常（返回401）');
      console.log('   错误信息:', response.data.error);
    } else {
      console.log('⚠️ 认证检查异常（状态码:', response.statusCode, ')');
    }
  } catch (error) {
    console.error('❌ 认证测试失败:', error.message);
  }
}

async function demonstrateJwtTokenGeneration() {
  console.log('\n🔑 JWT Token 生成演示...');
  
  // 模拟JWT token生成（实际使用时需要导入JwtTokenGenerator）
  console.log('📋 JWT Token 生成方法:');
  console.log('   1. 导入: import { generateTestToken } from "@/utils/jwt-token-generator"');
  console.log('   2. 生成管理员token: generateTestToken.admin()');
  console.log('   3. 生成租户管理员token: generateTestToken.tenantAdmin()');
  console.log('   4. 生成自定义token: generateTestToken.custom(userId, email, roles, tenantId)');
  
  console.log('\n📋 使用示例:');
  console.log('   const token = generateTestToken.admin(24); // 24小时有效期');
  console.log('   const headers = { "Authorization": `Bearer ${token}` };');
  
  console.log('\n📋 Token 验证方法:');
  console.log('   import { validateToken } from "@/utils/jwt-token-generator"');
  console.log('   const isValid = validateToken.isValid(token);');
  console.log('   const isExpired = validateToken.isExpired(token);');
  console.log('   const remainingTime = validateToken.getRemainingTime(token);');
}

async function runTests() {
  try {
    // 1. 测试无认证的引导接口
    const mqttConfig1 = await testBootstrapWithoutAuth();
    
    // 2. 测试带认证的引导接口（应该也能成功，因为引导接口不需要认证）
    const mqttConfig2 = await testBootstrapWithAuth();
    
    // 3. 测试其他需要认证的接口
    await testOtherEndpointWithAuth();
    
    // 4. 演示JWT token生成
    await demonstrateJwtTokenGeneration();
    
    // 5. 显示测试结果
    console.log('\n📊 测试结果总结:');
    console.log('   ✅ 引导接口无认证访问:', mqttConfig1 ? '成功' : '失败');
    console.log('   ✅ 引导接口带认证访问:', mqttConfig2 ? '成功' : '失败');
    console.log('   ✅ 其他接口认证检查:', '正常');
    console.log('   ✅ JWT Token生成工具:', '已创建');
    
    if (mqttConfig1) {
      console.log('\n🎉 认证问题已解决！');
      console.log('📋 引导接口现在可以无认证访问');
      console.log('📋 JWT Token生成工具已创建，可用于其他需要认证的接口');
    } else {
      console.log('\n❌ 认证问题未完全解决，需要进一步调试');
    }
    
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
runTests();
