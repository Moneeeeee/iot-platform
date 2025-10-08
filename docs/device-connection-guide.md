# 🔌 IoT设备连接流程详解

## 连接步骤概览

```
设备上电 → 引导请求 → 获取配置 → MQTT连接 → 数据通信
    ↓         ↓         ↓         ↓         ↓
  启动     发送身份   接收配置   建立连接   发布/订阅
```

## 详细流程说明

### 1️⃣ 设备引导阶段

**目标**: 获取连接配置和凭证

**API调用**:
```bash
POST /api/config/bootstrap
```

**请求内容**:
- 设备ID和MAC地址
- 固件和硬件信息
- 设备能力和类型
- 租户信息

**服务器处理**:
- 验证设备身份
- 生成MQTT配置（主题、ACL、QoS策略）
- 创建动态凭证
- 决定OTA策略
- 生成设备策略

### 2️⃣ MQTT连接阶段

**目标**: 建立与MQTT Broker的安全连接

**连接参数**:
- Broker URL: `mqtt://broker.iot-platform.com:1883`
- Client ID: `tenant-001_device-001_timestamp`
- Username: `tenant-001_device-001`
- Password: `动态生成的密码`

**主题结构**:
```
iot/{tenantId}/{deviceType}/{deviceId}/{channel}
├── telemetry     # 遥测数据发布
├── status        # 设备状态发布
├── event         # 事件发布
├── cmd           # 命令订阅
├── cmdres        # 命令响应发布
├── shadow/desired    # 影子期望状态订阅
├── shadow/reported   # 影子报告状态发布
├── cfg           # 配置订阅
└── ota/progress  # OTA进度发布
```

### 3️⃣ 数据通信阶段

**设备发布**:
- 遥测数据 → `telemetry` 主题
- 设备状态 → `status` 主题
- 事件信息 → `event` 主题
- 命令响应 → `cmdres` 主题

**设备订阅**:
- 服务器命令 ← `cmd` 主题
- 配置更新 ← `cfg` 主题
- 影子期望 ← `shadow/desired` 主题

## 安全特性

### 🔐 认证机制
- 动态用户名/密码
- 密码过期时间
- 设备身份验证

### 🛡️ 权限控制
- ACL主题权限
- 租户隔离
- 设备类型限制

### 🔒 通信安全
- TLS加密（可选）
- 消息签名验证
- QoS保证

## 实际使用示例

### 启动服务器
```bash
cd /opt/iot-platform/backend
npm start
```

### 运行设备示例
```bash
cd /opt/iot-platform/examples
node device-connection-example.js
```

### 测试连接
```bash
# 使用curl测试引导接口
curl -X POST http://localhost:8000/api/config/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-001",
    "mac": "AA:BB:CC:DD:EE:FF",
    "firmware": {
      "current": "1.0.0",
      "build": "001",
      "minRequired": "1.0.0"
    },
    "hardware": {
      "version": "v1.0",
      "serial": "HW123"
    },
    "capabilities": [
      {"name": "temperature_sensor", "version": "1.0"}
    ],
    "deviceType": "sensor",
    "tenantId": "test-tenant",
    "timestamp": 1704067200000
  }'
```

## 故障排除

### 常见问题

1. **引导请求失败**
   - 检查设备ID和MAC地址格式
   - 确认租户ID存在
   - 验证请求签名

2. **MQTT连接失败**
   - 检查Broker URL和端口
   - 验证用户名/密码
   - 确认网络连接

3. **主题权限错误**
   - 检查ACL配置
   - 确认主题格式正确
   - 验证设备类型

### 调试技巧

1. **启用详细日志**
   ```bash
   DEBUG=mqtt* node device-connection-example.js
   ```

2. **使用MQTT客户端测试**
   ```bash
   mosquitto_pub -h localhost -t "iot/test-tenant/sensor/test-device-001/cmd" -m '{"action":"get_status"}'
   ```

3. **检查服务器日志**
   ```bash
   tail -f /opt/iot-platform/backend/logs/app.log
   ```

## 最佳实践

### 设备端
- 实现重连机制
- 缓存配置信息
- 处理网络异常
- 定期刷新凭证

### 服务器端
- 监控连接状态
- 实现负载均衡
- 配置备份策略
- 性能优化

## 扩展功能

### 网关设备
- 支持子设备管理
- 批量数据处理
- 本地缓存

### 边缘计算
- 本地决策
- 离线模式
- 数据同步

### 多协议支持
- HTTP/HTTPS
- WebSocket
- CoAP
- LoRaWAN
