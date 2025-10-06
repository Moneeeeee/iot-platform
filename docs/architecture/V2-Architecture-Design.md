# IoT 平台 V2 架构设计文档

## 📖 文档概述

本文档描述 IoT 平台 V2 的完整架构设计，包括多租户、模块化、可扩展、OTA 管理等核心能力。

**版本**: V2.0  
**日期**: 2025-01-06  
**状态**: 实施中

---

## 🎯 设计目标

### 核心原则

1. **模块化**: 设备管理、模板、状态、遥测、告警、OTA、固件仓库、租户、用户会话、日志等模块独立，接口松耦合
2. **可扩展**: 设备属性/传感器模板化 + JSON，新增设备类型不改核心表
3. **多租户**: 统一 tenant_id，所有模块按租户隔离，中间件鉴权注入 tenant_id
4. **分层数据**: 高频、低频、低功耗、一次性测量统一接入，按热/冷分层存储，可配置保留策略
5. **异构协议统一**: MQTT、UDP、WebSocket 入站都走统一消息处理总线 → 存储层/业务层插件

### 验收要点

- ✅ 新增设备类型无需改核心表即可落地
- ✅ 低功耗/一次性/事件驱动模式均可接入
- ✅ 遥测保留策略可按配置执行
- ✅ OTA 灰度可按策略分配并可追踪
- ✅ 多租户隔离默认生效，跨模块一致

---

## 🏗️ 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    客户端层 (Client Layer)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Web UI   │  │ Mobile   │  │ API      │  │ CLI      │   │
│  │ (React)  │  │ App      │  │ Clients  │  │ Tools    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      网关层 (Gateway Layer)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Nginx Reverse Proxy + Load Balancer                 │  │
│  │  - SSL/TLS Termination                               │  │
│  │  - Rate Limiting                                      │  │
│  │  - Request Routing                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application Layer)                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Node.js + Express + TypeScript           │ │
│  │                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐│ │
│  │  │ REST API     │  │ WebSocket    │  │ GraphQL     ││ │
│  │  │ /api/*       │  │ /ws          │  │ (Optional)  ││ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘│ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐│ │
│  │  │         中间件层 (Middleware Layer)              ││ │
│  │  │  - 多租户中间件 (Tenant Extraction)             ││ │
│  │  │  - JWT 认证 (Auth Middleware)                   ││ │
│  │  │  - 权限控制 (RBAC)                              ││ │
│  │  │  - 请求日志 (Request Logging)                   ││ │
│  │  │  - 错误处理 (Error Handler)                     ││ │
│  │  └──────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    业务层 (Business Layer)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  设备管理    │  │  OTA管理    │  │  数据保留策略        │ │
│  │  - 模板引擎  │  │  - 固件仓库  │  │  - 冷热分层         │ │
│  │  - 验证器    │  │  - 灰度发布  │  │  - 自动清理         │ │
│  │  - 生命周期  │  │  - 进度追踪  │  │  - 数据压缩         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  告警管理    │  │  租户管理    │  │  用户管理           │ │
│  │  - 规则引擎  │  │  - 限额控制  │  │  - 角色权限         │ │
│  │  - 通知分发  │  │  - 配额管理  │  │  - 会话管理         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 消息总线层 (Message Bus Layer)               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           统一消息总线 (Unified Message Bus)            │ │
│  │                                                         │ │
│  │  Dev:  EventEmitter (内存)                             │ │
│  │  Prod: Redis Pub/Sub (分布式)                          │ │
│  │                                                         │ │
│  │  通道 (Channels):                                       │ │
│  │  - device:telemetry                                    │ │
│  │  - device:status                                       │ │
│  │  - device:events                                       │ │
│  │  - device:commands                                     │ │
│  │  - ota:progress                                        │ │
│  │  - ota:status                                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  MQTT Adapter   │  │  UDP Adapter    │  │  WS Adapter     │
│  - 设备遥测     │  │  - UDP 数据报   │  │  - 实时推送     │
│  - 状态上报     │  │  - 批量数据     │  │  - 订阅管理     │
│  - OTA 响应     │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    协议层 (Protocol Layer)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  MQTT    │  │   UDP    │  │   TCP    │  │   HTTP   │   │
│  │  Broker  │  │  Server  │  │  Server  │  │  Server  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (Data Layer)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │       PostgreSQL + TimescaleDB (时序数据优化)          │ │
│  │                                                         │ │
│  │  核心表 (多租户):                                       │ │
│  │  ├── tenants               (租户)                      │ │
│  │  ├── users                 (用户)                      │ │
│  │  ├── device_templates      (设备模板)                  │ │
│  │  ├── devices               (设备)                      │ │
│  │  ├── telemetry            ⭐Hypertable (遥测数据)      │ │
│  │  ├── device_status_history⭐Hypertable (状态历史)      │ │
│  │  ├── measurements          (一次性测量)                 │ │
│  │  ├── event_alerts          (事件告警)                  │ │
│  │  ├── firmwares             (固件仓库)                  │ │
│  │  ├── firmware_rollouts     (灰度发布)                  │ │
│  │  ├── firmware_update_status (更新追踪)                 │ │
│  │  ├── retention_policies    (保留策略)                  │ │
│  │  └── system_configs        (系统配置)                  │ │
│  │                                                         │ │
│  │  时序优化:                                              │ │
│  │  - 分区策略: 7天/chunk (Telemetry)                     │ │
│  │  - 压缩策略: 7天后压缩                                  │ │
│  │  - 保留策略: 3年自动清理                                │ │
│  │  - 连续聚合: 5分钟/1小时聚合视图                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Redis (缓存 + 消息)                    │ │
│  │  - 租户信息缓存                                         │ │
│  │  - 会话存储                                             │ │
│  │  - 消息队列 (Pub/Sub)                                   │ │
│  │  - 限流计数                                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 存储层 (Storage Layer)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  本地存储     │  │  对象存储     │  │  备份存储     │     │
│  │  /uploads     │  │  (S3/MinIO)  │  │  (Backup)    │     │
│  │  - 固件文件   │  │  - 固件归档   │  │  - 数据库    │     │
│  │  - 日志文件   │  │  - 冷数据     │  │  - 配置文件   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ 数据库设计

### 核心表结构

#### 1. 租户管理

```prisma
model Tenant {
  id              String        // 租户 ID
  slug            String        // 租户唯一标识
  name            String        // 租户名称
  plan            TenantPlan    // 套餐: BASIC/PROFESSIONAL/ENTERPRISE
  status          TenantStatus  // 状态: ACTIVE/SUSPENDED/TRIAL
  isolatedSchema  Boolean       // 是否使用独立 Schema
  schemaName      String?       // Schema 名称
  limits          Json          // 限额配置
}
```

#### 2. 设备模板（扩展核心）

```prisma
model DeviceTemplate {
  id                  String
  tenantId            String
  name                String
  type                String          // 自定义设备类型
  version             String          // 模板版本
  
  // 核心扩展点：JSON Schema
  attributes          Json            // 设备属性定义
  telemetryMetrics    Json            // 遥测指标定义
  events              Json            // 事件定义
  commands            Json            // 指令定义
  firmwareConstraints Json            // 固件约束
}
```

**属性定义示例**:

```json
{
  "attributes": {
    "voltage": {
      "type": "number",
      "unit": "V",
      "min": 0,
      "max": 500,
      "precision": 2,
      "serverMapping": "v"
    },
    "location": {
      "type": "object",
      "schema": {
        "lat": { "type": "number" },
        "lng": { "type": "number" }
      }
    }
  },
  "telemetryMetrics": [
    {
      "name": "temperature",
      "type": "number",
      "unit": "°C",
      "sampling": "1m",
      "range": [-40, 125],
      "validators": ["range(-40,125)"]
    }
  ],
  "commands": [
    {
      "name": "reboot",
      "params": {},
      "timeout": 30,
      "ackPolicy": "required",
      "retry": 3
    }
  ]
}
```

#### 3. 时序数据表（TimescaleDB）

```prisma
model Telemetry {
  id        String
  tenantId  String
  deviceId  String
  timestamp DateTime      // 分区键
  metrics   Json          // 遥测数据
  quality   DataQuality   // GOOD/UNCERTAIN/BAD
  protocol  ProtocolType
  source    String
}

// TimescaleDB Hypertable 配置:
// - 分区: 7天/chunk
// - 压缩: 7天后自动压缩
// - 保留: 3年自动清理
// - 聚合: 5分钟/1小时连续聚合视图
```

#### 4. OTA 管理

```prisma
model Firmware {
  id          String
  tenantId    String
  version     String
  channel     FirmwareChannel  // STABLE/BETA/ALPHA
  filepath    String           // 文件路径
  size        BigInt
  checksum    String           // SHA256
  metadata    Json
}

model FirmwareRollout {
  id          String
  firmwareId  String
  strategy    Json             // 灰度策略
  stats       Json             // 进度统计
  status      RolloutStatus    // DRAFT/ACTIVE/PAUSED/COMPLETED
}

model FirmwareUpdateStatus {
  deviceId    String
  rolloutId   String
  status      UpdateStatus     // PENDING/DOWNLOADING/INSTALLING/SUCCESS/FAILED
  progress    Int              // 0-100
  error       String?
}
```

**灰度策略示例**:

```json
{
  "type": "percentage",
  "percentage": 10,
  "increments": [10, 25, 50, 100],
  "filters": {
    "tags": ["pilot", "beta"],
    "regions": ["cn-east"]
  },
  "constraints": {
    "minBattery": 50,
    "wifiOnly": true,
    "timeWindow": {
      "start": "02:00",
      "end": "06:00"
    }
  },
  "rollback": {
    "autoRollback": true,
    "failureThreshold": 0.1
  }
}
```

### 数据分层策略

| 层级 | 时长 | 分辨率 | 压缩 | 存储 |
|------|------|--------|------|------|
| **Hot** | 30天 | 原始 | ❌ | SSD |
| **Warm** | 180天 | 5分钟聚合 | ✅ | SSD |
| **Cold** | 3年 | 1小时聚合 | ✅ | HDD |
| **Archive** | 可选 | 1天聚合 | ✅ | S3 |

---

## 🔌 消息总线设计

### 统一消息类型

```typescript
enum MessageType {
  TELEMETRY         // 设备遥测数据
  STATUS_CHANGE     // 设备状态变更
  DEVICE_EVENT      // 设备事件
  MEASUREMENT       // 一次性测量
  DEVICE_COMMAND    // 设备指令
  COMMAND_RESPONSE  // 指令响应
  OTA_PROGRESS      // OTA 进度
  OTA_STATUS        // OTA 状态
}
```

### 消息流转

```
设备 (MQTT) → MQTT Adapter → 消息总线 → 业务处理器 → 数据库
                                    ↓
                              WebSocket → 前端实时更新
```

### 消息总线实现

| 环境 | 实现 | 特性 |
|------|------|------|
| **Development** | EventEmitter | 内存，单机，快速 |
| **Production** | Redis Pub/Sub | 分布式，持久化，高可用 |

---

## 🔐 多租户隔离

### 隔离级别

#### 逻辑隔离（默认）

```typescript
// 中间件自动注入 tenant_id
req.tenant = { id: 'tenant_123', ... };

// Prisma 自动过滤
prisma.device.findMany({
  where: { tenantId: req.tenant.id }
});
```

#### Schema 隔离（超大客户）

```typescript
// 租户配置
{
  isolatedSchema: true,
  schemaName: 'tenant_enterprise_001'
}

// 动态切换 Schema
SET search_path TO tenant_enterprise_001;
```

### 租户限额管理

```json
{
  "limits": {
    "maxDevices": 10000,
    "maxUsers": 100,
    "maxTemplates": 50,
    "maxFirmwares": 20,
    "maxStorageGB": 100
  }
}
```

---

## 🚀 OTA 灰度发布流程

```
1. 上传固件 → 固件仓库
   ↓
2. 创建灰度发布 → 配置策略
   ↓
3. 启动发布 → 筛选目标设备
   ↓
4. 分阶段推进 → 10% → 25% → 50% → 100%
   ↓
5. 实时监控 → 成功率、失败率
   ↓
6. 自动回滚 ← 失败率超过阈值
   ↓
7. 完成发布 → 统计报告
```

### 灰度策略类型

| 策略 | 说明 | 示例 |
|------|------|------|
| **百分比** | 按比例分配 | 10% → 25% → 50% → 100% |
| **标签** | 按设备标签 | tags: ["pilot", "beta"] |
| **地域** | 按地理位置 | regions: ["cn-east"] |
| **设备列表** | 指定设备 | deviceIds: ["dev_001"] |
| **时间窗口** | 限制时间段 | 02:00-06:00 |

---

## 📊 监控与可观测性

### 关键指标

```
业务指标:
- 在线设备数
- 遥测数据吞吐量 (QPS)
- OTA 成功率
- 告警触发频率

系统指标:
- API 响应时间 (p50/p95/p99)
- 数据库查询性能
- 消息总线延迟
- 存储使用率

租户指标:
- 租户设备分布
- 租户 API 调用量
- 租户配额使用情况
```

### 日志策略

```
/var/log/iot-platform/
├── backend/
│   ├── application.log      (应用日志)
│   ├── access.log           (访问日志)
│   ├── error.log            (错误日志)
│   └── audit.log            (审计日志)
├── mqtt/
│   └── mqtt.log
├── postgres/
│   └── postgresql.log
└── nginx/
    ├── access.log
    └── error.log
```

---

## 🔧 部署架构

### Docker Compose 架构

```yaml
services:
  nginx:         # 反向代理 + 负载均衡
  backend:       # Node.js 应用
  mqtt-broker:   # MQTT Broker
  postgres:      # PostgreSQL + TimescaleDB
  redis:         # 缓存 + 消息队列
  grafana:       # 监控仪表盘
  prometheus:    # 指标采集
```

### 高可用部署

```
Production (3-Node Cluster):
- 3x Backend (Load Balanced)
- 3x PostgreSQL (Primary + 2 Replicas)
- 3x Redis (Sentinel Mode)
- 2x MQTT Broker (Clustered)
```

---

## 🎓 最佳实践

### 新增设备类型

```typescript
// 1. 创建设备模板
const template = await prisma.deviceTemplate.create({
  data: {
    tenantId,
    name: 'Smart Temperature Sensor v2',
    type: 'temperature_sensor',
    version: '2.0.0',
    attributes: { /* JSON Schema */ },
    telemetryMetrics: [ /* 指标定义 */ ],
  }
});

// 2. 创建设备实例
const device = await prisma.device.create({
  data: {
    tenantId,
    templateId: template.id,
    slug: 'sensor_001',
    name: 'Room Temperature Sensor',
  }
});

// ✅ 无需修改数据库结构！
```

### 数据保留策略

```typescript
// 租户级配置
await RetentionPolicyEngine.createPolicy({
  tenantId,
  name: 'Standard Telemetry Policy',
  dataType: 'TELEMETRY',
  tiers: {
    hot: { duration: '30d', resolution: 'raw' },
    warm: { duration: '180d', resolution: '5m', compression: true },
    cold: { duration: '3y', resolution: '1h', compression: true },
  }
});

// 自动执行
retentionScheduler.start(24); // 每24小时执行一次
```

---

## 📦 交付清单

✅ **模块化数据库模式**: Prisma Schema V2  
✅ **多租户中间件**: tenant.ts  
✅ **消息总线**: message-bus/index.ts  
✅ **设备模板引擎**: device-template/engine.ts  
✅ **OTA 管理系统**: ota/rollout-manager.ts  
✅ **数据保留策略**: data-retention/policy-engine.ts  
✅ **协议适配器**: protocol-adapters/mqtt-adapter.ts  
✅ **TimescaleDB 配置**: timescaledb-setup.sql  
✅ **迁移指南**: v2-migration-guide.md  
✅ **架构文档**: V2-Architecture-Design.md  

---

## 📞 支持

- **文档**: https://docs.iot-platform.com
- **API Reference**: https://api.iot-platform.com/docs
- **GitHub**: https://github.com/iot-platform/platform
- **技术支持**: support@iot-platform.com

---

**© 2025 IoT Platform. All rights reserved.**

