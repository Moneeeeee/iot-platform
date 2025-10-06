# PowerSafe API 快速测试指南

## 🚀 5分钟快速开始

### 1. 导入 Apifox 集合

1. **下载集合文件**: `PowerSafe-API-Apifox-Collection.json`
2. **打开 Apifox**
3. **导入集合**: 文件 → 导入 → 选择 JSON 文件
4. **设置环境变量**:
   - `baseUrl`: `https://fountain.top/Powersafe/api`
   - `macAddress`: `AA:BB:CC:DD:EE:FF`
   - `deviceId`: `PS-001`
   - `firmwareVersion`: `1.1.0`

### 2. 核心接口测试

#### ✅ 推荐接口：OTA检查接口

**URL**: `POST https://fountain.top/Powersafe/api/ota/check-device`

**请求体**:
```json
{
  "board_name": "PS-1000",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "firmware_version": "1.1.0",
  "hardware_version": "v2.1",
  "device_id": "PS-001",
  "boot_count": 123,
  "uptime": 86400,
  "free_heap": 32768,
  "wifi_ssid": "IoT-Network",
  "wifi_rssi": -45
}
```

**预期响应**:
```json
{
  "mqtt": {
    "broker": "mqtt://fountain.top:1883",
    "port": 1883,
    "username": "powersafe_AA:BB:CC:DD:EE:FF",
    "password": "base64_encoded_password",
    "client_id": "powersafe_AA:BB:CC:DD:EE:FF",
    "keepalive": 60,
    "clean_session": true,
    "ssl": false,
    "topics": {
      "data": "powersafe/AA:BB:CC:DD:EE:FF/data",
      "status": "powersafe/AA:BB:CC:DD:EE:FF/status",
      "command": "powersafe/AA:BB:CC:DD:EE:FF/command",
      "config": "powersafe/AA:BB:CC:DD:EE:FF/config"
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

## 🧪 测试步骤

### 步骤 1: 基础连通性测试
1. 点击 "OTA检查接口（推荐）"
2. 点击 "发送" 按钮
3. 检查响应状态码是否为 200
4. 验证响应包含 `mqtt`、`firmware`、`device_config` 字段

### 步骤 2: 数据完整性测试
1. 检查 MQTT 配置是否完整
2. 验证固件版本信息
3. 确认设备配置参数
4. 检查服务器时间同步

### 步骤 3: 错误处理测试
1. 运行 "错误测试 - 无效MAC地址"
2. 运行 "错误测试 - 缺少必需参数"
3. 验证错误响应格式正确

## 📊 测试检查清单

- [ ] **连通性**: 接口响应时间 < 5秒
- [ ] **状态码**: 正常请求返回 200
- [ ] **数据格式**: 响应为有效 JSON
- [ ] **必需字段**: 包含所有必需配置信息
- [ ] **MQTT配置**: broker、port、username、password 完整
- [ ] **固件信息**: version、url、checksum 存在
- [ ] **设备配置**: sampling_int、thresholds 正确
- [ ] **错误处理**: 错误请求返回适当错误码

## 🔧 常见问题解决

### 问题 1: 连接超时
**现象**: 请求超时或无法连接
**解决**: 
- 检查网络连接
- 确认 URL 地址正确
- 尝试使用不同的网络环境

### 问题 2: 认证失败
**现象**: 返回 401 或 403 错误
**解决**:
- 检查 MAC 地址格式 (AA:BB:CC:DD:EE:FF)
- 确认设备已在系统中注册
- 验证请求头设置

### 问题 3: 数据格式错误
**现象**: 返回 400 错误
**解决**:
- 检查 JSON 格式是否正确
- 确认所有必需字段都存在
- 验证数据类型匹配

## 📱 移动端测试

### 使用 Apifox 移动端
1. 下载 Apifox 移动端应用
2. 登录相同账号
3. 同步集合数据
4. 在移动端执行测试

### 使用 curl 命令
```bash
curl -X POST https://fountain.top/Powersafe/api/ota/check-device \
  -H "Content-Type: application/json" \
  -d '{
    "board_name": "PS-1000",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "firmware_version": "1.1.0",
    "hardware_version": "v2.1",
    "device_id": "PS-001",
    "boot_count": 123,
    "uptime": 86400,
    "free_heap": 32768,
    "wifi_ssid": "IoT-Network",
    "wifi_rssi": -45
  }'
```

## 🎯 测试目标

### 成功标准
- ✅ 所有接口响应时间 < 5秒
- ✅ 正常请求成功率 > 95%
- ✅ 错误处理正确率 100%
- ✅ 数据格式验证通过率 100%

### 性能指标
- **响应时间**: < 2秒 (目标)
- **并发处理**: 支持 100+ 并发请求
- **可用性**: 99.9% 服务可用性

---

**快速开始时间**: 5分钟  
**完整测试时间**: 15分钟  
**技术支持**: 如有问题请查看详细文档或联系技术支持
