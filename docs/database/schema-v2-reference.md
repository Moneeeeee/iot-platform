# 数据库 Schema V2 参考文档

## 📄 文件位置

Prisma Schema 文件：`backend/prisma/schema-v2.prisma`

## 🗄️ 核心数据表

### 多租户核心

#### Tenant（租户表）
```prisma
model Tenant {
  id              String        @id @default(cuid())
  slug            String        @unique
  name            String
  plan            TenantPlan    // BASIC/PROFESSIONAL/ENTERPRISE/CUSTOM
  status          TenantStatus  // ACTIVE/SUSPENDED/TRIAL/EXPIRED
  isolatedSchema  Boolean       // Schema 隔离开关
  schemaName      String?       // 独立 Schema 名称
  limits          Json          // 配额限制
}
```

**配额示例**:
```json
{
  "maxDevices": 10000,
  "maxUsers": 100,
  "maxTemplates": 50,
  "maxFirmwares": 20,
  "maxStorageGB": 100
}
```

---

### 设备模板系统

#### DeviceTemplate（设备模板表）
```prisma
model DeviceTemplate {
  id                  String
  tenantId            String
  name                String
  type                String          // 自定义设备类型
  version             String          // 模板版本
  
  // JSON 扩展字段
  attributes          Json            // 设备属性定义
  telemetryMetrics    Json            // 遥测指标定义
  events              Json            // 事件定义
  commands            Json            // 指令定义
  firmwareConstraints Json            // 固件约束
}
```

**模板示例**:
```json
{
  "attributes": {
    "voltage": {
      "type": "number",
      "unit": "V",
      "min": 0,
      "max": 500,
      "precision": 2
    }
  },
  "telemetryMetrics": [
    {
      "name": "temperature",
      "type": "number",
      "unit": "°C",
      "range": [-40, 125],
      "validators": ["range(-40,125)"]
    }
  ]
}
```

---

### 设备管理

#### Device（设备表）
```prisma
model Device {
  id             String
  tenantId       String
  userId         String?
  templateId     String         // 关联模板
  
  slug           String         // 设备唯一标识
  name           String
  
  attributes     Json           // 设备属性值
  metadata       Json           // 运行时元数据
  status         DeviceStatus   // ONLINE/OFFLINE/ERROR/MAINTENANCE
  
  protocol       ProtocolType   // MQTT/UDP/TCP/HTTP/WEBSOCKET
  connectionInfo Json           // 连接信息
}
```

---

### 时序数据（TimescaleDB Hypertable）

#### Telemetry（遥测数据表）⭐
```prisma
model Telemetry {
  id        String
  tenantId  String
  deviceId  String
  timestamp DateTime      // 分区键
  metrics   Json          // 遥测指标
  quality   DataQuality   // GOOD/UNCERTAIN/BAD
  protocol  ProtocolType
  source    String
}
```

**TimescaleDB 配置**:
- ✅ Hypertable（7天/chunk）
- ✅ 自动压缩（7天后）
- ✅ 保留策略（3年）
- ✅ 连续聚合（5分钟、1小时）

#### DeviceStatusHistory（设备状态历史）⭐
```prisma
model DeviceStatusHistory {
  id        String
  tenantId  String
  deviceId  String
  timestamp DateTime
  status    DeviceStatus
  context   Json
}
```

---

### OTA 固件管理

#### Firmware（固件仓库）
```prisma
model Firmware {
  id          String
  tenantId    String
  version     String
  channel     FirmwareChannel  // STABLE/BETA/ALPHA/CANARY
  filepath    String
  size        BigInt
  checksum    String           // SHA256
  metadata    Json
}
```

#### FirmwareRollout（灰度发布）
```prisma
model FirmwareRollout {
  id          String
  firmwareId  String
  strategy    Json             // 灰度策略配置
  stats       Json             // 进度统计
  status      RolloutStatus    // DRAFT/ACTIVE/PAUSED/COMPLETED/ROLLBACK
}
```

**策略示例**:
```json
{
  "type": "percentage",
  "percentage": 10,
  "increments": [10, 25, 50, 100],
  "filters": {
    "tags": ["pilot"],
    "regions": ["cn-east"]
  },
  "constraints": {
    "minBattery": 50,
    "wifiOnly": true,
    "timeWindow": { "start": "02:00", "end": "06:00" }
  },
  "rollback": {
    "autoRollback": true,
    "failureThreshold": 0.1
  }
}
```

#### FirmwareUpdateStatus（更新追踪）
```prisma
model FirmwareUpdateStatus {
  deviceId    String
  rolloutId   String
  status      UpdateStatus     // PENDING/DOWNLOADING/INSTALLING/SUCCESS/FAILED
  progress    Int              // 0-100
  error       String?
}
```

---

### 数据保留策略

#### RetentionPolicy（保留策略表）
```prisma
model RetentionPolicy {
  id          String
  tenantId    String
  name        String
  dataType    DataType         // TELEMETRY/DEVICE_STATUS/EVENTS/LOGS
  tiers       Json             // 分层配置
  scope       Json             // 应用范围
}
```

**分层配置示例**:
```json
{
  "hot": {
    "duration": "30d",
    "resolution": "raw",
    "compression": false
  },
  "warm": {
    "duration": "180d",
    "resolution": "5m",
    "compression": true
  },
  "cold": {
    "duration": "3y",
    "resolution": "1h",
    "compression": true
  }
}
```

---

### 事件与告警

#### EventAlert（事件告警表）
```prisma
model EventAlert {
  id             String
  tenantId       String
  deviceId       String
  eventType      String
  level          AlertLevel      // INFO/WARNING/ERROR/CRITICAL
  status         AlertStatus     // ACTIVE/ACKNOWLEDGED/RESOLVED
  title          String
  message        String
  data           Json
  triggeredAt    DateTime
  resolvedAt     DateTime?
}
```

---

### 用户管理

#### User（用户表）
```prisma
model User {
  id           String
  tenantId     String         // 多租户隔离
  username     String
  email        String
  passwordHash String
  role         UserRole       // ADMIN/OPERATOR/VIEWER/DEVICE_MANAGER/OTA_MANAGER
  permissions  String[]
  language     Language       // ZH_CN/ZH_TW/EN
}
```

---

## 🔍 索引策略

### 多租户查询优化
所有主表都有复合索引：
```sql
CREATE INDEX idx_table_tenant_id ON table (tenant_id, ...);
```

### 时序数据索引
```sql
CREATE INDEX idx_telemetry_tenant_device_time 
  ON telemetry (tenant_id, device_id, timestamp DESC);
```

### JSON 字段索引（热点查询）
```sql
CREATE INDEX idx_device_tags 
  ON devices USING GIN ((metadata->'tags'));
```

---

## 📊 数据类型枚举

### TenantPlan
- `BASIC` - 基础版
- `PROFESSIONAL` - 专业版
- `ENTERPRISE` - 企业版
- `CUSTOM` - 定制版

### DeviceStatus
- `ONLINE` - 在线
- `OFFLINE` - 离线
- `ERROR` - 错误
- `MAINTENANCE` - 维护中
- `PROVISIONING` - 配置中
- `DECOMMISSIONED` - 已停用

### ProtocolType
- `MQTT`
- `TCP`
- `UDP`
- `HTTP`
- `HTTPS`
- `WEBSOCKET`
- `COAP`
- `LORAWAN`

### AlertLevel
- `INFO` - 信息
- `WARNING` - 警告
- `ERROR` - 错误
- `CRITICAL` - 严重

### UpdateStatus（OTA）
- `PENDING` - 待处理
- `SCHEDULED` - 已调度
- `DOWNLOADING` - 下载中
- `DOWNLOADED` - 已下载
- `INSTALLING` - 安装中
- `SUCCESS` - 成功
- `FAILED` - 失败
- `CANCELLED` - 已取消
- `ROLLBACK` - 回滚

---

## 🔗 关系图

```
Tenant
├── User[]
├── Device[]
├── DeviceTemplate[]
├── Firmware[]
└── RetentionPolicy[]

DeviceTemplate
└── Device[]

Device
├── Telemetry[]
├── DeviceStatusHistory[]
├── EventAlert[]
├── Measurement[]
└── FirmwareUpdateStatus[]

Firmware
└── FirmwareRollout[]
    └── FirmwareUpdateStatus[]
```

---

## 📝 使用示例

### 创建设备模板
```typescript
const template = await prisma.deviceTemplate.create({
  data: {
    tenantId: 'tenant_001',
    name: 'Smart Temperature Sensor',
    type: 'temperature_sensor',
    version: '1.0.0',
    attributes: {
      location: { type: 'string' },
      calibration: { type: 'number' }
    },
    telemetryMetrics: [
      { name: 'temperature', type: 'number', unit: '°C' }
    ]
  }
});
```

### 创建设备
```typescript
const device = await prisma.device.create({
  data: {
    tenantId: 'tenant_001',
    templateId: template.id,
    slug: 'sensor_001',
    name: 'Room 101 Temperature Sensor',
    attributes: {
      location: 'Room 101',
      calibration: 0.5
    }
  }
});
```

### 写入遥测数据
```typescript
await prisma.telemetry.create({
  data: {
    tenantId: 'tenant_001',
    deviceId: device.id,
    metrics: {
      temperature: 22.5,
      humidity: 65
    },
    protocol: 'MQTT',
    source: 'mqtt-adapter'
  }
});
```

---

## 🚀 迁移命令

```bash
# 生成 Prisma Client
npx prisma generate

# 应用迁移
npx prisma migrate deploy

# 初始化 TimescaleDB
psql -h localhost -U postgres -d iot_platform \
  -f backend/prisma/migrations/v2-timescaledb-setup.sql
```

---

**参考**: `backend/prisma/schema-v2.prisma`

