# PowerSafe API Apifox 测试指南

## 🚀 快速开始

### 1. 导入 API 文档到 Apifox

1. **打开 Apifox**
2. **创建新项目** 或选择现有项目
3. **导入 API 文档**：
   - 点击 "导入" 按钮
   - 选择 "OpenAPI/Swagger" 或 "Postman Collection"
   - 或者手动创建接口

### 2. 配置环境变量

在 Apifox 中设置环境变量：

| 变量名 | 变量值 | 说明 |
|--------|--------|------|
| `baseUrl` | `https://fountain.top/Powersafe/api` | API 基础地址 |
| `macAddress` | `AA:BB:CC:DD:EE:FF` | 测试用 MAC 地址 |
| `deviceId` | `PS-001` | 测试用设备 ID |
| `firmwareVersion` | `1.1.0` | 当前固件版本 |

## 📋 接口测试配置

### 1. 设备配置接口

**接口信息**：
- **方法**: `POST`
- **URL**: `{{baseUrl}}/config`
- **Content-Type**: `application/json`

**请求体**：
```json
{
  "board_name": "PS-1000",
  "mac_address": "{{macAddress}}",
  "firmware_version": "{{firmwareVersion}}",
  "hardware_version": "v2.1",
  "device_id": "{{deviceId}}",
  "boot_count": 123,
  "uptime": 86400,
  "free_heap": 32768,
  "wifi_ssid": "IoT-Network",
  "wifi_rssi": -45
}
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "mqtt": {
      "broker": "mqtt://fountain.top:1883",
      "port": 1883,
      "username": "powersafe_{{macAddress}}",
      "password": "base64_encoded_password",
      "client_id": "powersafe_{{macAddress}}",
      "keepalive": 60,
      "clean_session": true,
      "ssl": false,
      "topics": {
        "data": "powersafe/{{macAddress}}/data",
        "status": "powersafe/{{macAddress}}/status",
        "command": "powersafe/{{macAddress}}/command",
        "config": "powersafe/{{macAddress}}/config"
      }
    },
    "websocket": {
      "url": "wss://fountain.top/ws/powersafe",
      "reconnect_interval": 5000,
      "heartbeat_interval": 30000,
      "timeout": 10000
    },
    "firmware": {
      "version": "1.2.0",
      "url": "https://fountain.top/Powersafe/api/ota/download/1.2.0",
      "force": 0,
      "checksum": "sha256:abc123def456...",
      "size": 2048576,
      "release_notes": "PowerSafe固件v1.2.0更新：\n- 优化电源监控精度\n- 增强异常检测算法\n- 修复已知问题"
    },
    "activation": {
      "required": false,
      "server": "https://fountain.top/Powersafe/api/activation",
      "timeout": 30000
    },
    "server_time": {
      "timestamp": 1704067200000,
      "timezone_offset": 480
    },
    "device_config": {
      "sampling_interval": 1000,
      "voltage_threshold": {
        "min": 180,
        "max": 250
      },
      "current_threshold": {
        "min": 0,
        "max": 80
      },
      "power_threshold": {
        "min": 0,
        "max": 25000
      },
      "alarm_enabled": true,
      "data_retention_days": 30,
      "auto_reboot_hour": 3
    }
  }
}
```

### 2. OTA 检查接口（推荐）

**接口信息**：
- **方法**: `POST`
- **URL**: `{{baseUrl}}/ota/check-device`
- **Content-Type**: `application/json`

**请求体**：
```json
{
  "board_name": "PS-1000",
  "mac_address": "{{macAddress}}",
  "firmware_version": "{{firmwareVersion}}",
  "hardware_version": "v2.1",
  "device_id": "{{deviceId}}",
  "boot_count": 123,
  "uptime": 86400,
  "free_heap": 32768,
  "wifi_ssid": "IoT-Network",
  "wifi_rssi": -45
}
```

**预期响应**：
```json
{
  "mqtt": {
    "broker": "mqtt://fountain.top:1883",
    "port": 1883,
    "username": "powersafe_{{macAddress}}",
    "password": "base64_encoded_password",
    "client_id": "powersafe_{{macAddress}}",
    "keepalive": 60,
    "clean_session": true,
    "ssl": false,
    "topics": {
      "data": "powersafe/{{macAddress}}/data",
      "status": "powersafe/{{macAddress}}/status",
      "command": "powersafe/{{macAddress}}/command",
      "config": "powersafe/{{macAddress}}/config"
    }
  },
  "websocket": {
    "url": "wss://fountain.top/ws/powersafe",
    "reconnect_int": 5000,
    "heartbeat_int": 30000,
    "timeout": 10000
  },
  "firmware": {
    "version": "1.2.0",
    "url": "https://fountain.top/Powersafe/api/ota/download/1.2.0",
    "force": 0,
    "checksum": "sha256:abc123def456...",
    "size": 2048576,
    "release_notes": "PowerSafe固件v1.2.0更新：\n- 优化电源监控精度\n- 增强异常检测算法\n- 修复已知问题"
  },
  "activation": {
    "required": false,
    "server": "https://fountain.top/Powersafe/api/activation",
    "timeout": 30000,
    "timeout_ms": 30000,
    "message": "设备激活成功",
    "code": "",
    "challenge": ""
  },
  "server_time": {
    "timestamp": 1704067200000,
    "timezone_off": 480
  },
  "device_config": {
    "sampling_int": 500,
    "voltage_thresh": {
      "min": 200,
      "max": 240
    },
    "current_thresh": {
      "min": 0,
      "max": 80
    },
    "power_thresh": {
      "min": 0,
      "max": 25000
    },
    "alarm_enabled": true,
    "data_retention": 30,
    "auto_reboot": 3
  }
}
```

### 3. 设备状态上报接口

**接口信息**：
- **方法**: `POST`
- **URL**: `{{baseUrl}}/status`
- **Content-Type**: `application/json`

**请求体**：
```json
{
  "mac_address": "{{macAddress}}",
  "timestamp": 1704067200000,
  "status": "online",
  "voltage": 220.5,
  "current": 15.8,
  "power": 3480,
  "frequency": 50.0,
  "temperature": 35.2,
  "uptime": 86400,
  "free_heap": 32768,
  "wifi_rssi": -45,
  "alarms": []
}
```

### 4. 设备数据上报接口

**接口信息**：
- **方法**: `POST`
- **URL**: `{{baseUrl}}/data`
- **Content-Type**: `application/json`

**请求体**：
```json
{
  "mac_address": "{{macAddress}}",
  "timestamp": 1704067200000,
  "data": {
    "voltage": 220.5,
    "current": 15.8,
    "power": 3480,
    "frequency": 50.0,
    "temperature": 35.2,
    "power_factor": 0.95,
    "energy_total": 1234.56
  },
  "alarms": [
    {
      "type": "voltage_high",
      "value": 250.2,
      "threshold": 250.0,
      "timestamp": 1704067200000
    }
  ]
}
```

## 🧪 测试场景

### 场景 1: 正常设备配置获取

1. **测试目标**: 验证设备能正常获取配置信息
2. **测试步骤**:
   - 发送设备配置请求
   - 验证响应包含完整的 MQTT、WebSocket、固件配置
   - 检查服务器时间同步
3. **预期结果**: 返回 200 状态码，包含完整配置信息

### 场景 2: OTA 升级检查

1. **测试目标**: 验证 OTA 升级检查功能
2. **测试步骤**:
   - 发送 OTA 检查请求
   - 验证固件版本信息
   - 检查下载链接和校验和
3. **预期结果**: 返回固件更新信息或当前版本确认

### 场景 3: 设备状态上报

1. **测试目标**: 验证设备状态上报功能
2. **测试步骤**:
   - 发送设备状态数据
   - 验证数据格式正确性
   - 检查告警信息处理
3. **预期结果**: 返回成功确认消息

### 场景 4: 错误处理测试

1. **测试目标**: 验证 API 错误处理
2. **测试步骤**:
   - 发送无效的 MAC 地址
   - 发送缺少必需参数的请求
   - 发送格式错误的 JSON
3. **预期结果**: 返回相应的错误码和错误信息

## 🔧 Apifox 高级功能

### 1. 自动化测试

创建测试用例集合：

```javascript
// 前置脚本示例
pm.environment.set("timestamp", Date.now());
pm.environment.set("randomMac", "AA:BB:CC:DD:EE:" + Math.floor(Math.random() * 100).toString(16).padStart(2, '0'));

// 后置脚本示例
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has required fields", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('mqtt');
    pm.expect(jsonData).to.have.property('firmware');
    pm.expect(jsonData).to.have.property('device_config');
});
```

### 2. 数据驱动测试

创建 CSV 文件进行批量测试：

```csv
macAddress,deviceId,firmwareVersion,expectedStatus
AA:BB:CC:DD:EE:01,PS-001,1.1.0,200
AA:BB:CC:DD:EE:02,PS-002,1.0.5,200
AA:BB:CC:DD:EE:03,PS-003,1.2.0,200
```

### 3. 环境切换

配置多个环境：

- **开发环境**: `https://dev.fountain.top/Powersafe/api`
- **测试环境**: `https://test.fountain.top/Powersafe/api`
- **生产环境**: `https://fountain.top/Powersafe/api`

## 📊 测试报告

### 关键指标

1. **响应时间**: < 2 秒
2. **成功率**: > 99%
3. **数据完整性**: 所有必需字段都存在
4. **错误处理**: 正确的错误码和消息

### 测试检查清单

- [ ] 设备配置接口正常响应
- [ ] OTA 检查接口返回正确信息
- [ ] 状态上报接口接受数据
- [ ] 数据上报接口处理正确
- [ ] 错误情况返回适当错误码
- [ ] 响应时间在可接受范围内
- [ ] JSON 格式验证通过
- [ ] 必需字段都存在
- [ ] 数据类型正确

## 🚨 常见问题

### 1. 连接超时

**问题**: 请求超时
**解决方案**: 
- 检查网络连接
- 确认服务器地址正确
- 增加超时时间设置

### 2. 认证失败

**问题**: 401 未授权
**解决方案**:
- 检查 MAC 地址格式
- 确认设备已注册
- 验证请求头设置

### 3. 数据格式错误

**问题**: 400 错误请求
**解决方案**:
- 检查 JSON 格式
- 验证必需字段
- 确认数据类型

## 📞 技术支持

如果在测试过程中遇到问题，请提供：

1. **请求详情**: URL、方法、请求体
2. **响应信息**: 状态码、响应体、错误信息
3. **环境信息**: Apifox 版本、操作系统
4. **重现步骤**: 详细的操作步骤

---

**文档版本**: v1.0.0  
**更新时间**: 2024-01-01  
**适用 API 版本**: v1.0.0
