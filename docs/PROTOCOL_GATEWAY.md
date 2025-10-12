# 协议网关设计文档

> **版本**: 1.0.0  
> **更新日期**: 2025-10-12  
> **核心理念**: 多协议统一接入，转换为内部标准格式

---

## 🎯 一、设计目标

### 核心职责

**protocol-gateway** 是协议适配层的核心服务，负责：

1. **协议适配**: 支持多种 IoT 协议接入
2. **格式转换**: 将不同协议数据转换为统一格式
3. **协议桥接**: 设备协议 ←→ NATS 内部总线
4. **安全验证**: 设备身份认证与授权
5. **消息路由**: 根据规则路由消息到不同服务

---

## 🌐 二、支持的协议

### 协议优先级与实施阶段

| 协议 | 应用场景 | 实施阶段 | 优先级 |
|------|---------|---------|--------|
| **MQTT** | WiFi/4G/5G 设备 | Phase 1 | ⭐⭐⭐ |
| **HTTP/HTTPS** | 轮询设备、Web 设备 | Phase 1 | ⭐⭐⭐ |
| **WebSocket** | 浏览器、手机 App | Phase 1 | ⭐⭐⭐ |
| **CoAP** | NB-IoT/轻量级设备 | Phase 2 | ⭐⭐ |
| **LoRaWAN** | 低功耗广域网 | Phase 2 | ⭐⭐ |
| **Modbus** | 工业设备 | Phase 2 | ⭐⭐ |
| **WebRTC** | 视频流设备 | Phase 3 | ⭐ |
| **蓝牙代理** | BLE 设备（手机中继） | Phase 3 | ⭐ |

---

## 🏗️ 三、架构设计

### 整体架构

```
┌─────────────────────────────────────────────────┐
│              Protocol Gateway Service            │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ MQTT Adapter │  │ HTTP Adapter │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ CoAP Adapter │  │ LoRa Adapter │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  WS Adapter  │  │Modbus Adapter│            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│         ↓ 统一处理流程 ↓                          │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  Message Processor (消息处理核心)        │    │
│  │  - 身份验证                              │    │
│  │  - 格式转换                              │    │
│  │  - 数据校验                              │    │
│  │  - 消息路由                              │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│         ↓ 发布到 NATS ↓                          │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  NATS Publisher                         │    │
│  │  Subject: iot.{tenant}.{device}.{type} │    │
│  └────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 适配器模式设计

每个协议适配器实现统一接口：

```typescript
interface ProtocolAdapter {
  // 适配器名称
  name: string;
  
  // 初始化
  initialize(): Promise<void>;
  
  // 启动监听
  start(): Promise<void>;
  
  // 停止服务
  stop(): Promise<void>;
  
  // 处理消息（设备 → 云端）
  handleUpstream(message: RawMessage): Promise<StandardMessage>;
  
  // 处理命令（云端 → 设备）
  handleDownstream(command: StandardCommand): Promise<void>;
}
```

---

## 📡 四、MQTT 适配器设计

### MQTT Broker 集成

```typescript
// mqtt-adapter.ts
import mqtt from 'mqtt';
import { ProtocolAdapter, RawMessage, StandardMessage } from '../types';

export class MqttAdapter implements ProtocolAdapter {
  name = 'mqtt';
  private client: mqtt.MqttClient;
  
  async initialize() {
    // 连接到 EMQX
    this.client = mqtt.connect('mqtt://emqx:1883', {
      clientId: 'protocol-gateway-mqtt',
      username: 'gateway',
      password: process.env.MQTT_PASSWORD,
      clean: false,
      reconnectPeriod: 1000
    });
    
    // 订阅所有设备上行消息
    this.client.subscribe('iot/+/+/telemetry', { qos: 1 });
    this.client.subscribe('iot/+/+/event', { qos: 1 });
    this.client.subscribe('iot/+/+/status', { qos: 1 });
    
    // 处理消息
    this.client.on('message', async (topic, payload) => {
      await this.onMessage(topic, payload);
    });
  }
  
  async handleUpstream(message: RawMessage): Promise<StandardMessage> {
    // 解析 MQTT Topic: iot/{tenantId}/{deviceId}/{type}
    const parts = message.topic.split('/');
    const [, tenantId, deviceId, type] = parts;
    
    // 解析 Payload
    const data = JSON.parse(message.payload.toString());
    
    // 转换为标准格式
    return {
      messageId: generateId(),
      timestamp: Date.now(),
      tenantId,
      deviceId,
      type,
      payload: data,
      protocol: 'mqtt',
      metadata: {
        qos: message.qos,
        retain: message.retain
      }
    };
  }
  
  async handleDownstream(command: StandardCommand): Promise<void> {
    // 转换为 MQTT Topic
    const topic = `iot/${command.tenantId}/${command.deviceId}/command`;
    
    // 发布命令
    await this.client.publishAsync(
      topic,
      JSON.stringify(command.payload),
      { qos: 1, retain: false }
    );
  }
}
```

### EMQX Rule Hook 配置

在 EMQX 中配置 Rule Engine，自动转发消息：

```sql
-- EMQX Rule SQL
SELECT
  topic,
  payload,
  qos,
  clientid,
  username,
  timestamp
FROM
  "iot/#"
WHERE
  topic =~ '^iot/[^/]+/[^/]+/(telemetry|event|status)$'
```

**Action**: HTTP POST to `http://protocol-gateway:8007/mqtt/ingest`

---

## 🌐 五、HTTP/HTTPS 适配器设计

### RESTful API 端点

```typescript
// http-adapter.ts
import { FastifyInstance } from 'fastify';

export class HttpAdapter implements ProtocolAdapter {
  name = 'http';
  
  async initialize(app: FastifyInstance) {
    // 设备数据上报
    app.post('/api/v1/telemetry', async (request, reply) => {
      const { deviceId, data } = request.body;
      const tenantId = request.user.tenantId;  // 从 JWT 获取
      
      // 转换为标准格式
      const message = {
        messageId: generateId(),
        timestamp: Date.now(),
        tenantId,
        deviceId,
        type: 'telemetry',
        payload: data,
        protocol: 'http',
        metadata: {
          ip: request.ip,
          userAgent: request.headers['user-agent']
        }
      };
      
      // 发布到 NATS
      await publishToNATS(message);
      
      return { success: true, messageId: message.messageId };
    });
    
    // 设备状态上报
    app.post('/api/v1/status', async (request, reply) => {
      // 类似处理
    });
    
    // 设备轮询命令（长轮询）
    app.get('/api/v1/command/:deviceId', async (request, reply) => {
      const { deviceId } = request.params;
      const tenantId = request.user.tenantId;
      
      // 长轮询等待命令（超时 30 秒）
      const command = await waitForCommand(tenantId, deviceId, 30000);
      
      if (command) {
        return { command: command.payload };
      } else {
        return { command: null };
      }
    });
  }
}
```

### 认证方式

```typescript
// HTTP 设备认证
app.addHook('preHandler', async (request, reply) => {
  const token = request.headers['authorization']?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Missing device token');
  }
  
  // 验证 Device Token
  const device = await verifyDeviceToken(token);
  request.user = {
    tenantId: device.tenantId,
    deviceId: device.deviceId
  };
});
```

---

## 📶 六、CoAP 适配器设计

### CoAP Server 实现

CoAP (Constrained Application Protocol) 是轻量级 IoT 协议，适用于 NB-IoT 设备。

```typescript
// coap-adapter.ts
import coap from 'coap';

export class CoapAdapter implements ProtocolAdapter {
  name = 'coap';
  private server: coap.Server;
  
  async initialize() {
    this.server = coap.createServer();
    
    // 处理 POST 请求（设备上报数据）
    this.server.on('request', async (req, res) => {
      if (req.method === 'POST' && req.url === '/telemetry') {
        await this.handleTelemetry(req, res);
      } else {
        res.code = '4.04';
        res.end('Not Found');
      }
    });
    
    this.server.listen(5683);
  }
  
  async handleTelemetry(req, res) {
    // 解析 CoAP Payload
    const payload = JSON.parse(req.payload.toString());
    
    // 从 Token 中提取设备信息
    const deviceId = req.headers['Device-Id'];
    const tenantId = await getTenantByDevice(deviceId);
    
    // 转换为标准格式
    const message = {
      messageId: generateId(),
      timestamp: Date.now(),
      tenantId,
      deviceId,
      type: 'telemetry',
      payload: payload.data,
      protocol: 'coap',
      metadata: {
        rssi: req.rssi
      }
    };
    
    // 发布到 NATS
    await publishToNATS(message);
    
    // 响应
    res.code = '2.01';
    res.end(JSON.stringify({ success: true }));
  }
}
```

### NB-IoT 设备接入流程

```
NB-IoT 设备
  ↓ CoAP POST coap://gateway:5683/telemetry
CoAP Server (protocol-gateway)
  ↓ 验证设备 Token
  ↓ 解析数据
  ↓ 转换格式
NATS JetStream
  ↓ iot.tenant_001.device.nbiot_001.telemetry
telemetry-service 订阅消费
```

---

## 📡 七、LoRaWAN 适配器设计

### LoRa 网关桥接

LoRa 设备不能直连云端，需要通过 LoRa 网关中转。

```typescript
// lora-adapter.ts
export class LoraAdapter implements ProtocolAdapter {
  name = 'lora';
  
  async initialize(app: FastifyInstance) {
    // 接收 LoRa 网关转发的数据
    // 通常使用 ChirpStack、TTN 或自建网关
    
    app.post('/lora/uplink', async (request, reply) => {
      const { deviceEUI, data, metadata } = request.body;
      
      // 根据 deviceEUI 查询租户和设备信息
      const device = await getDeviceByEUI(deviceEUI);
      
      // 解码 LoRa Payload（通常是二进制）
      const decoded = decodeLoraPayload(data, device.profile);
      
      // 转换为标准格式
      const message = {
        messageId: generateId(),
        timestamp: Date.now(),
        tenantId: device.tenantId,
        deviceId: device.deviceId,
        type: 'telemetry',
        payload: decoded,
        protocol: 'lora',
        metadata: {
          rssi: metadata.rssi,
          snr: metadata.snr,
          frequency: metadata.frequency,
          gatewayId: metadata.gatewayId
        }
      };
      
      // 发布到 NATS
      await publishToNATS(message);
      
      return { success: true };
    });
    
    // LoRa 下行命令
    app.post('/lora/downlink', async (request, reply) => {
      // 发送命令到 LoRa 网关
    });
  }
}
```

### LoRa Payload 解码

LoRa 设备通常发送紧凑的二进制数据，需要解码：

```typescript
function decodeLoraPayload(hexData: string, profile: DeviceProfile): any {
  const buffer = Buffer.from(hexData, 'hex');
  
  // 根据设备 Profile 解码
  if (profile === 'temperature_sensor') {
    return {
      temperature: buffer.readInt16BE(0) / 100,  // 2 字节，除以 100
      battery: buffer.readUInt8(2)               // 1 字节
    };
  } else if (profile === 'gps_tracker') {
    return {
      lat: buffer.readInt32BE(0) / 1000000,
      lng: buffer.readInt32BE(4) / 1000000,
      speed: buffer.readUInt16BE(8) / 10
    };
  }
  
  // 默认返回原始 Hex
  return { raw: hexData };
}
```

---

## 🔌 八、WebSocket 适配器设计

### WebSocket Server

用于浏览器、手机 App、蓝牙代理等场景。

```typescript
// websocket-adapter.ts
import WebSocket from 'ws';

export class WebSocketAdapter implements ProtocolAdapter {
  name = 'websocket';
  private wss: WebSocket.Server;
  private clients: Map<string, WebSocket> = new Map();
  
  async initialize() {
    this.wss = new WebSocket.Server({ port: 8080 });
    
    this.wss.on('connection', async (ws, req) => {
      // 从 URL 参数中获取 Token
      const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
      const device = await verifyDeviceToken(token);
      
      const clientId = `${device.tenantId}:${device.deviceId}`;
      this.clients.set(clientId, ws);
      
      // 处理消息
      ws.on('message', async (data) => {
        const message = JSON.parse(data.toString());
        
        // 转换为标准格式
        const standardMsg = {
          messageId: generateId(),
          timestamp: Date.now(),
          tenantId: device.tenantId,
          deviceId: device.deviceId,
          type: message.type || 'telemetry',
          payload: message.data,
          protocol: 'websocket'
        };
        
        // 发布到 NATS
        await publishToNATS(standardMsg);
      });
      
      // 连接断开
      ws.on('close', () => {
        this.clients.delete(clientId);
      });
    });
  }
  
  async handleDownstream(command: StandardCommand): Promise<void> {
    const clientId = `${command.tenantId}:${command.deviceId}`;
    const ws = this.clients.get(clientId);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'command',
        command: command.payload
      }));
    }
  }
}
```

---

## 🔄 九、消息处理核心

### 统一消息处理流程

```typescript
// message-processor.ts
export class MessageProcessor {
  async process(adapter: ProtocolAdapter, rawMessage: RawMessage) {
    // 1. 协议适配器转换
    const standardMsg = await adapter.handleUpstream(rawMessage);
    
    // 2. 身份验证
    await this.authenticate(standardMsg);
    
    // 3. 数据校验
    await this.validate(standardMsg);
    
    // 4. 数据转换
    const transformed = await this.transform(standardMsg);
    
    // 5. 发布到 NATS
    await this.publishToNATS(transformed);
    
    // 6. 记录日志
    await this.log(transformed);
  }
  
  private async authenticate(msg: StandardMessage) {
    // 验证设备是否属于该租户
    const device = await deviceService.get(msg.tenantId, msg.deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    if (device.status === 'disabled') {
      throw new Error('Device is disabled');
    }
  }
  
  private async validate(msg: StandardMessage) {
    // 数据格式验证
    if (!msg.payload || typeof msg.payload !== 'object') {
      throw new Error('Invalid payload');
    }
    
    // 数据范围验证（可选）
    // 例如：温度传感器的值应该在 -50 ~ 100 之间
  }
  
  private async transform(msg: StandardMessage) {
    // 数据单位转换
    // 例如：华氏度 → 摄氏度
    
    // 数据类型转换
    // 例如：字符串 → 数字
    
    // 时间戳标准化
    if (!msg.timestamp) {
      msg.timestamp = Date.now();
    }
    
    return msg;
  }
  
  private async publishToNATS(msg: StandardMessage) {
    const subject = `iot.${msg.tenantId}.device.${msg.deviceId}.${msg.type}`;
    
    await nats.publish(subject, JSON.stringify(msg));
  }
}
```

---

## 📊 十、消息路由规则

### 基于类型的路由

```typescript
// router.ts
export class MessageRouter {
  async route(message: StandardMessage) {
    const baseSubject = `iot.${message.tenantId}.device.${message.deviceId}`;
    
    switch (message.type) {
      case 'telemetry':
        // 遥测数据 → telemetry-service
        await nats.publish(`${baseSubject}.telemetry`, message);
        break;
        
      case 'event':
        // 事件数据 → rule-engine
        await nats.publish(`${baseSubject}.event`, message);
        await nats.publish(`iot.${message.tenantId}.events.all`, message);
        break;
        
      case 'status':
        // 状态变化 → device-service
        await nats.publish(`${baseSubject}.status`, message);
        break;
        
      case 'alarm':
        // 告警数据 → alarm-service
        await nats.publish(`${baseSubject}.alarm`, message);
        await nats.publish(`iot.${message.tenantId}.alarms.all`, message);
        break;
        
      default:
        // 未知类型 → 日志记录
        logger.warn('Unknown message type', message);
    }
  }
}
```

---

## 🔐 十一、安全设计

### 设备认证

```typescript
// auth.ts
export class DeviceAuthenticator {
  async verifyMQTT(clientId: string, username: string, password: string) {
    // MQTT 认证
    // ClientID 格式: {tenantId}:{deviceId}
    const [tenantId, deviceId] = clientId.split(':');
    
    // 验证 Device Token
    const device = await deviceService.get(tenantId, deviceId);
    if (!device) return false;
    
    // 验证 Password (Device Token)
    const valid = await bcrypt.compare(password, device.tokenHash);
    return valid;
  }
  
  async verifyHTTP(token: string) {
    // HTTP Bearer Token 认证
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const device = await deviceService.get(decoded.tenantId, decoded.deviceId);
    if (!device) throw new Error('Device not found');
    if (device.status === 'disabled') throw new Error('Device disabled');
    
    return device;
  }
}
```

### ACL 权限控制

```typescript
// 每个设备只能发布到自己的 Topic
export function checkACL(device: Device, topic: string): boolean {
  const allowedPattern = `iot/${device.tenantId}/${device.deviceId}/*`;
  return matchPattern(topic, allowedPattern);
}
```

---

## 📈 十二、性能优化

### 连接池管理

```typescript
// connection-pool.ts
export class ConnectionPool {
  private mqttConnections: Map<string, mqtt.MqttClient> = new Map();
  
  async getMQTTConnection(brokerId: string): Promise<mqtt.MqttClient> {
    if (!this.mqttConnections.has(brokerId)) {
      const client = await createMQTTConnection(brokerId);
      this.mqttConnections.set(brokerId, client);
    }
    return this.mqttConnections.get(brokerId)!;
  }
}
```

### 批量处理

```typescript
// 批量发布到 NATS
const BATCH_SIZE = 100;
const BATCH_TIMEOUT = 100; // ms

const batch: StandardMessage[] = [];

async function addToBatch(message: StandardMessage) {
  batch.push(message);
  
  if (batch.length >= BATCH_SIZE) {
    await flushBatch();
  }
}

async function flushBatch() {
  if (batch.length === 0) return;
  
  const messages = batch.splice(0);
  await Promise.all(
    messages.map(msg => publishToNATS(msg))
  );
}
```

---

## 🎯 十三、部署配置

### Docker Compose 配置

```yaml
protocol-gateway:
  image: iot-platform/protocol-gateway:latest
  ports:
    - "8007:8007"   # HTTP API
    - "8080:8080"   # WebSocket
    - "5683:5683/udp"  # CoAP
  environment:
    - NATS_URL=nats://nats:4222
    - MQTT_URL=mqtt://emqx:1883
    - REDIS_URL=redis://redis:6379
    - LOG_LEVEL=info
  depends_on:
    - nats
    - emqx
    - redis
```

### 环境变量

```bash
# NATS 配置
NATS_URL=nats://nats:4222
NATS_USER=gateway
NATS_PASSWORD=secret

# MQTT 配置
MQTT_URL=mqtt://emqx:1883
MQTT_USERNAME=gateway
MQTT_PASSWORD=secret

# 协议端口
HTTP_PORT=8007
WEBSOCKET_PORT=8080
COAP_PORT=5683

# 性能配置
BATCH_SIZE=100
BATCH_TIMEOUT=100
MAX_CONNECTIONS=10000
```

---

## 🔍 十四、监控与调试

### 关键指标

```yaml
协议统计:
  - protocol_messages_in{protocol="mqtt"}: MQTT 消息数
  - protocol_messages_in{protocol="http"}: HTTP 消息数
  - protocol_messages_in{protocol="coap"}: CoAP 消息数

处理性能:
  - message_processing_duration: 处理耗时
  - message_transform_errors: 转换错误数
  - message_publish_errors: 发布错误数

连接状态:
  - mqtt_connections_active: MQTT 活跃连接
  - websocket_connections_active: WebSocket 活跃连接
```

### 日志格式

```json
{
  "timestamp": "2025-10-12T10:30:00Z",
  "level": "info",
  "protocol": "mqtt",
  "tenantId": "tenant_001",
  "deviceId": "device_001",
  "messageId": "msg_123",
  "action": "message_received",
  "duration": 15,
  "metadata": {
    "topic": "iot/tenant_001/device_001/telemetry",
    "payloadSize": 256
  }
}
```

---

## ✅ 十五、总结

### 设计优势

1. **协议无关**: 业务层不关心设备使用何种协议
2. **易扩展**: 新增协议只需实现适配器接口
3. **统一处理**: 所有协议消息经过相同的验证和转换流程
4. **高性能**: 异步处理 + 批量发布
5. **可观测**: 完整的监控和日志

### 协议对比

| 协议 | 连接方式 | 数据量 | 功耗 | 适用场景 |
|------|---------|-------|------|---------|
| MQTT | 长连接 | 小-中 | 低 | WiFi/4G/5G 设备 |
| HTTP | 短连接 | 中 | 中 | 轮询设备、Web |
| WebSocket | 长连接 | 小-中 | 低 | 浏览器、App |
| CoAP | UDP | 小 | 极低 | NB-IoT 设备 |
| LoRa | 短包 | 极小 | 极低 | 远距离低功耗 |
| Modbus | 长连接 | 小 | - | 工业设备 |

---

**文档维护者**: Fountain IoT Team  
**最后更新**: 2025-10-12

