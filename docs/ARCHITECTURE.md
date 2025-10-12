# Fountain IoT Platform - 架构设计文档

> **版本**: 1.0.0  
> **更新日期**: 2025-10-12  
> **架构理念**: 消息总线驱动的多租户 IoT SaaS 平台

---

## 📐 一、总体架构概览

### 四层架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    设备/边缘层 (Device Layer)              │
│  ESP32 | STM32 | 树莓派 | 工控机 | LoRa | NB-IoT          │
│  WiFi | 4G | 5G | 蓝牙 | 视频流                           │
└─────────────────────────────────────────────────────────┘
                         ↓ 多协议接入
┌─────────────────────────────────────────────────────────┐
│                 协议接入层 (Protocol Layer)                │
│  MQTT Broker | HTTP API | LoRa Gateway | CoAP Server     │
│  WebSocket | RTSP/WebRTC                                │
└─────────────────────────────────────────────────────────┘
                         ↓ 协议转换
┌─────────────────────────────────────────────────────────┐
│                消息总线层 (Message Bus Layer)              │
│          NATS JetStream (内部事件总线)                     │
│  Topic: iot.{tenant}.{deviceId}.{dataType}              │
└─────────────────────────────────────────────────────────┘
                         ↓ 事件驱动
┌─────────────────────────────────────────────────────────┐
│                  业务服务层 (Service Layer)                │
│  微服务集群 (Fastify + TypeScript)                         │
│  Auth | Device | Telemetry | OTA | Rule | Tenant        │
└─────────────────────────────────────────────────────────┘
                         ↓ 数据持久化
┌─────────────────────────────────────────────────────────┐
│                  数据存储层 (Data Layer)                   │
│  PostgreSQL | TimescaleDB | Redis | MinIO               │
└─────────────────────────────────────────────────────────┘
                         ↑ 查询/展示
┌─────────────────────────────────────────────────────────┐
│                   前端层 (Frontend Layer)                 │
│  Next.js 15 + React 19 + Tailwind CSS                   │
│  多租户控制台 | 实时监控 | 设备管理                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 二、微服务架构设计

### 核心设计原则

1. **消息总线驱动**: 所有服务间通信通过 NATS，解耦合
2. **协议无关**: 设备协议在接入层统一转换为内部事件
3. **多租户隔离**: 数据库 schema + Redis namespace + NATS subject 三层隔离
4. **水平扩展**: 每个微服务可独立扩展
5. **最终一致性**: 使用事件溯源保证数据一致性

### 服务列表与职责

| 服务名称 | 端口 | 技术栈 | 核心职责 | Phase |
|---------|------|--------|---------|-------|
| **auth-service** | 8001 | Fastify + JWT + PostgreSQL | 用户认证、设备令牌、权限管理 | Phase 1 |
| **config-service** | 8002 | Fastify + Redis + Vault | 动态配置中心、密钥管理、策略分发 | Phase 1 |
| **device-service** | 8003 | Fastify + PostgreSQL + NATS | 设备注册、影子同步、心跳管理、分组 | Phase 1 |
| **telemetry-service** | 8004 | Fastify + TimescaleDB + NATS | 时序数据接收、存储、查询优化 | Phase 1 |
| **ota-service** | 8005 | Fastify + MinIO + Redis | 固件管理、灰度升级、差分更新 | Phase 1 |
| **tenant-service** | 8006 | Fastify + PostgreSQL | 租户管理、配额控制、计费对接 | Phase 2 |
| **protocol-gateway** | 8007 | Node.js + NATS | 多协议适配（LoRa/NB-IoT/CoAP） | Phase 2 |
| **rule-engine** | 8008 | Node.js + NATS + Redis | 规则引擎、设备联动、条件触发 | Phase 2 |
| **alarm-service** | 8009 | Fastify + PostgreSQL + NATS | 告警管理、通知推送、沉默策略 | Phase 2 |
| **stream-service** | 8010 | Node.js + MinIO | 视频流处理（RTSP/WebRTC/HLS） | Phase 3 |
| **analytics-service** | 8011 | Python + ClickHouse | 数据分析、报表生成、AI 预测 | Phase 3 |
| **frontend** | 3000 | Next.js 15 + React 19 | 多租户控制台、实时监控界面 | Phase 1 |

---

## 🔄 三、消息总线设计（核心）

### 为什么不用 MQTT 做内部总线？

❌ **MQTT 的局限**:
- MQTT 是设备通信协议，不是企业级消息总线
- 缺少持久化、重放、消费组等高级特性
- 不适合微服务间的复杂交互

✅ **NATS JetStream 的优势**:
- 真正的消息总线，支持流式处理
- 内置持久化、exactly-once 语义
- 支持消费组、工作队列、请求/响应
- 高性能（百万级 TPS）
- 轻量级部署

### NATS Topic 设计规范

```
设备数据上报:
  iot.{tenant_id}.device.{device_id}.telemetry
  例: iot.tenant_001.device.esp32_001.telemetry

设备状态变化:
  iot.{tenant_id}.device.{device_id}.status
  例: iot.tenant_001.device.esp32_001.status

设备命令下发:
  iot.{tenant_id}.device.{device_id}.command
  例: iot.tenant_001.device.esp32_001.command

规则引擎事件:
  iot.{tenant_id}.rule.{rule_id}.trigger
  例: iot.tenant_001.rule.temp_alert.trigger

告警事件:
  iot.{tenant_id}.alarm.{alarm_id}.notify
  例: iot.tenant_001.alarm.high_temp.notify
```

### 消息流转示例

```
1. 设备通过 MQTT 发送数据到 EMQX
   MQTT Topic: iot/tenant_001/esp32_001/telemetry
   Payload: {"temp": 25.5, "humidity": 60}

2. EMQX 通过 Rule Hook 转发到 protocol-gateway
   
3. protocol-gateway 转换并发布到 NATS
   NATS Subject: iot.tenant_001.device.esp32_001.telemetry
   
4. telemetry-service 订阅并存储到 TimescaleDB
   
5. rule-engine 订阅并触发规则（如温度告警）
   
6. alarm-service 接收告警事件，推送通知
   
7. frontend 通过 WebSocket 实时显示数据
```

---

## 🌐 四、协议接入架构

### 协议接入流程

```
┌──────────────┐
│  MQTT 设备    │ → mqtt://emqx:1883 → EMQX Broker
└──────────────┘                           ↓
                                    Rule Hook 转发
┌──────────────┐                           ↓
│  LoRa 设备    │ → LoRa Gateway → HTTP API
└──────────────┘                           ↓
                                    protocol-gateway
┌──────────────┐                           ↓
│ NB-IoT 设备   │ → CoAP Server              ↓
└──────────────┘                           ↓
                                    统一发布到 NATS
┌──────────────┐                           ↓
│  HTTP 设备    │ → HTTP API → device-service
└──────────────┘                           ↓

┌──────────────┐                    iot.{tenant}.device.{id}.{type}
│ 蓝牙设备(手机) │ → WebSocket → protocol-gateway
└──────────────┘                           ↓
                                    
┌──────────────┐                    各业务服务订阅消费
│  视频设备     │ → RTSP/WebRTC → stream-service
└──────────────┘
```

### 协议适配器设计

**protocol-gateway** 包含多个适配器：

```typescript
// protocol-gateway/src/adapters/
├── mqtt-adapter.ts       // MQTT 协议处理
├── lora-adapter.ts       // LoRa 网关对接
├── nbiot-adapter.ts      // NB-IoT (CoAP) 处理
├── coap-adapter.ts       // CoAP 通用处理
├── bluetooth-adapter.ts  // 蓝牙代理（手机中继）
└── http-adapter.ts       // HTTP 轮询设备
```

每个适配器职责：
1. 接收特定协议的数据
2. 解析并验证数据格式
3. 转换为统一的内部格式
4. 发布到 NATS 对应 subject

---

## 🗄️ 五、数据存储设计

### 数据分层存储策略

| 数据类型 | 存储方案 | 保留策略 | 查询特点 |
|---------|---------|---------|---------|
| **用户、租户、设备元数据** | PostgreSQL | 永久 | 事务性、关系查询 |
| **时序传感器数据** | TimescaleDB | 根据租户配置（默认1年） | 时间范围查询、聚合 |
| **设备在线状态、会话** | Redis | 短期（TTL） | 极快读写、过期自动清理 |
| **固件文件、视频录像** | MinIO | 根据策略（默认3个月） | 对象存储、流式读取 |
| **大数据分析** | ClickHouse (可选) | 按需 | OLAP 分析、报表 |
| **日志、审计记录** | Loki / PostgreSQL | 6个月 | 全文搜索、追溯 |

### PostgreSQL 数据库设计

#### 多租户隔离方案

采用 **Schema-per-Tenant** 模式：

```sql
-- 公共 Schema (存储租户信息)
CREATE SCHEMA platform;

CREATE TABLE platform.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  quota_devices INT DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 每个租户独立 Schema
CREATE SCHEMA tenant_001;

CREATE TABLE tenant_001.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255),
  type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'offline',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tenant_001.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);
```

优势：
- ✅ 数据完全隔离，安全性高
- ✅ 可单独备份某个租户
- ✅ 性能优秀（索引不跨租户）

### TimescaleDB 时序数据设计

```sql
-- 设备遥测数据表（自动分区）
CREATE TABLE telemetry (
  time TIMESTAMPTZ NOT NULL,
  tenant_id UUID NOT NULL,
  device_id UUID NOT NULL,
  metric VARCHAR(100) NOT NULL,
  value DOUBLE PRECISION,
  unit VARCHAR(20),
  tags JSONB
);

-- 创建 Hypertable（自动按时间分区）
SELECT create_hypertable('telemetry', 'time');

-- 创建索引
CREATE INDEX idx_telemetry_device ON telemetry (device_id, time DESC);
CREATE INDEX idx_telemetry_metric ON telemetry (metric, time DESC);

-- 自动压缩旧数据
ALTER TABLE telemetry SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id'
);

-- 7天后压缩
SELECT add_compression_policy('telemetry', INTERVAL '7 days');

-- 1年后自动删除
SELECT add_retention_policy('telemetry', INTERVAL '365 days');
```

### Redis 数据结构设计

```
设备在线状态:
  Key: device:online:{tenant_id}:{device_id}
  Type: String
  Value: timestamp
  TTL: 300s (心跳超时)

设备影子（缓存）:
  Key: device:shadow:{tenant_id}:{device_id}
  Type: Hash
  Fields: {reported, desired, metadata}

用户会话:
  Key: session:{user_id}:{session_id}
  Type: String
  Value: JWT payload
  TTL: 7200s

租户配额计数:
  Key: tenant:quota:{tenant_id}:devices
  Type: String (计数)
  
消息队列（BullMQ）:
  Queue: ota:upgrade
  Queue: alarm:notify
  Queue: rule:execute
```

---

## 🔐 六、安全架构设计

### 认证与授权体系

```
┌─────────────────────────────────────────┐
│          认证层 (Authentication)          │
├─────────────────────────────────────────┤
│  用户认证: JWT (Bearer Token)             │
│  设备认证: Device Token / MQTT ClientID   │
│  服务认证: mTLS / API Key                 │
└─────────────────────────────────────────┘
          ↓ 认证通过后
┌─────────────────────────────────────────┐
│           授权层 (Authorization)          │
├─────────────────────────────────────────┤
│  基于角色: Admin / Operator / Viewer      │
│  基于资源: Device / Rule / Dashboard      │
│  基于租户: 跨租户访问完全隔离                │
└─────────────────────────────────────────┘
          ↓ 授权通过后
┌─────────────────────────────────────────┐
│           审计层 (Audit)                  │
├─────────────────────────────────────────┤
│  操作日志: 所有敏感操作记录                 │
│  访问日志: API 调用追踪                    │
│  数据变更: 设备状态、配置修改历史             │
└─────────────────────────────────────────┘
```

### 数据加密

- **传输加密**: 
  - HTTPS (TLS 1.3)
  - MQTT over TLS
  - WebSocket Secure (WSS)
  
- **存储加密**:
  - 密钥存储在 Vault
  - 敏感字段数据库加密（PGP）
  - MinIO 对象加密

### 设备认证流程

```
1. 设备注册（首次）
   → 扫码/输入设备 SN
   → device-service 生成 Device Token
   → 设备使用 Token 连接 MQTT

2. MQTT 连接认证
   → EMQX Auth Hook 调用 auth-service
   → 验证 Device Token
   → 分配 ACL（只能发布到自己的 topic）

3. Token 刷新
   → 设备定期刷新 Token（每7天）
   → 使用 Refresh Token 机制
```

---

## 📊 七、可观测性设计

### 三大支柱

```
┌──────────────────────────────────────────┐
│           Metrics (指标监控)               │
│  Prometheus + Grafana                    │
│  - 服务健康状态                            │
│  - 设备在线率                              │
│  - API 响应时间                            │
│  - 消息吞吐量                              │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│            Logging (日志)                 │
│  Loki + Grafana                          │
│  - 应用日志                                │
│  - 错误追踪                                │
│  - 审计日志                                │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│           Tracing (链路追踪)              │
│  Tempo + Grafana                         │
│  - 分布式事务追踪                          │
│  - 服务调用链                              │
│  - 性能瓶颈分析                            │
└──────────────────────────────────────────┘
```

### 核心监控指标

```yaml
设备层指标:
  - device_online_count: 在线设备数
  - device_message_rate: 消息频率
  - device_error_rate: 设备错误率

服务层指标:
  - http_request_duration: API 响应时间
  - http_request_total: API 调用次数
  - nats_msg_rate: NATS 消息速率
  - db_connection_pool: 数据库连接池

资源层指标:
  - cpu_usage: CPU 使用率
  - memory_usage: 内存使用率
  - disk_io: 磁盘 IO
  - network_bandwidth: 网络带宽
```

---

## 🚀 八、部署架构

### Docker Compose 部署（Phase 1-3）

```
单机部署 (8核16G推荐):
├── 基础设施容器 (docker-compose.yml)
│   ├── postgres
│   ├── timescaledb
│   ├── redis
│   ├── nats
│   ├── emqx
│   └── minio
│
├── Phase 1 服务 (docker-compose.phase1.yml)
│   ├── auth-service
│   ├── device-service
│   ├── telemetry-service
│   ├── ota-service
│   └── frontend
│
├── Phase 2 服务 (docker-compose.phase2.yml)
│   ├── tenant-service
│   ├── protocol-gateway
│   ├── rule-engine
│   └── alarm-service
│
└── Phase 3 服务 (docker-compose.phase3.yml)
    ├── stream-service
    ├── analytics-service
    └── monitoring-stack (Prometheus/Grafana)
```

### Kubernetes 部署（Phase 4）

```
云原生部署 (生产环境):
├── Namespace 隔离
│   ├── iot-infra (基础设施)
│   ├── iot-core (核心服务)
│   └── iot-monitoring (监控)
│
├── Helm Charts
│   ├── iot-platform-infra
│   └── iot-platform-services
│
├── 自动伸缩
│   ├── HPA (水平扩展)
│   └── VPA (垂直扩展)
│
└── 高可用
    ├── 多副本部署
    ├── 跨区域容灾
    └── 自动故障转移
```

---

## 🔄 九、演进路线图

### Phase 1: MVP 核心功能 (3-4个月)

**目标**: 支持 MQTT 设备 + 基础监控 + 单租户测试

- [x] 基础设施搭建
- [ ] auth-service (JWT 认证)
- [ ] device-service (设备管理)
- [ ] telemetry-service (数据采集)
- [ ] ota-service (固件升级)
- [ ] frontend (基础界面)

**支持设备**: ESP32/STM32 通过 WiFi/4G

---

### Phase 2: 多租户 + 协议扩展 (2-3个月)

**目标**: 完整 SaaS + 多协议支持

- [ ] tenant-service (租户管理)
- [ ] protocol-gateway (LoRa/NB-IoT)
- [ ] rule-engine (规则引擎)
- [ ] alarm-service (告警系统)
- [ ] 设备分组、批量管理

**支持设备**: + LoRa/NB-IoT

---

### Phase 3: 高级功能 (2个月)

**目标**: 视频流 + 数据分析

- [ ] stream-service (视频处理)
- [ ] analytics-service (数据分析)
- [ ] 蓝牙设备支持
- [ ] Grafana 监控栈
- [ ] 性能优化

**支持设备**: 全部类型

---

### Phase 4: 云原生化 (可选)

**目标**: Kubernetes 部署

- [ ] Helm Charts
- [ ] ArgoCD
- [ ] 多区域部署

---

## 📝 十、技术选型理由

| 技术 | 选型理由 | 替代方案 |
|------|---------|---------|
| **Fastify** | 高性能、TypeScript 原生支持、插件丰富 | Express, Koa, NestJS |
| **NATS** | 轻量级、高性能、支持流式处理 | Kafka (重), RabbitMQ (慢) |
| **TimescaleDB** | PostgreSQL 扩展、SQL 友好、自动分区 | InfluxDB (学习成本), Prometheus (不适合长期) |
| **EMQX** | 百万级连接、集群支持、企业级 | Mosquitto (单机), VerneMQ (社区小) |
| **MinIO** | S3 兼容、自托管、高性能 | AWS S3 (成本), Ceph (复杂) |
| **Next.js 15** | SSR、App Router、React 19 | Vue (生态), Angular (重) |
| **PostgreSQL** | 成熟稳定、JSONB、多租户支持 | MySQL (功能少), MongoDB (非关系) |

---

## 🎯 十一、架构优势总结

1. ✅ **松耦合**: NATS 消息总线实现服务解耦
2. ✅ **可扩展**: 每个服务可独立扩展
3. ✅ **协议无关**: 支持任意协议接入
4. ✅ **多租户**: 完整隔离方案
5. ✅ **高性能**: 异步事件驱动
6. ✅ **可观测**: 完整监控体系
7. ✅ **渐进式**: 可从单机平滑迁移到 K8s

---

## 📚 参考资料

- [NATS JetStream 文档](https://docs.nats.io/nats-concepts/jetstream)
- [EMQX 最佳实践](https://www.emqx.io/docs/zh/v5.0/)
- [TimescaleDB 架构](https://docs.timescale.com/)
- [多租户设计模式](https://learn.microsoft.com/zh-cn/azure/architecture/guide/multitenant/overview)

---

**文档维护者**: Fountain IoT Team  
**最后更新**: 2025-10-12

