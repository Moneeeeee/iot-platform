# Fountain IoT Platform

> **云原生的多租户 IoT SaaS 平台** - 支持多协议设备接入、实时数据处理、规则引擎、OTA 升级等完整功能

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)](https://www.docker.com/)
[![Phase](https://img.shields.io/badge/phase-1%20ready-green.svg)](#)

---
1
## 🌟 项目特点

### 核心优势

- ✅ **多协议支持**: MQTT, HTTP, WebSocket, CoAP, LoRa, Modbus 等
- ✅ **多租户 SaaS**: 完整的租户隔离与配额管理
- ✅ **消息总线驱动**: 基于 NATS JetStream 的事件驱动架构
- ✅ **高性能**: 异步处理，支持百万级设备连接
- ✅ **可扩展**: 微服务架构，每个服务可独立扩展
- ✅ **渐进式部署**: 从单机 Docker Compose 到 Kubernetes 平滑演进
- ✅ **完整监控**: Prometheus + Grafana + Loki 可观测性体系

### 技术栈

| 类别 | 技术选型 |
|------|---------|
| **后端框架** | Fastify + TypeScript |
| **前端框架** | Next.js 15 + React 19 + Tailwind CSS |
| **消息总线** | NATS JetStream |
| **MQTT Broker** | EMQX 5.x |
| **关系数据库** | PostgreSQL 16 |
| **时序数据库** | TimescaleDB |
| **缓存** | Redis 7 |
| **对象存储** | MinIO |
| **监控** | Prometheus + Grafana + Loki |

---

## 🏗️ 架构设计

### 四层架构

```
┌─────────────────────────────────────────┐
│         设备层 (Device Layer)            │
│  ESP32 | STM32 | 树莓派 | 工控机 | LoRa  │
└─────────────────────────────────────────┘
                    ↓ 多协议接入
┌─────────────────────────────────────────┐
│       协议接入层 (Protocol Layer)         │
│  MQTT | HTTP | WebSocket | CoAP | LoRa  │
└─────────────────────────────────────────┘
                    ↓ 统一转换
┌─────────────────────────────────────────┐
│       消息总线层 (Message Bus)           │
│          NATS JetStream                 │
└─────────────────────────────────────────┘
                    ↓ 事件驱动
┌─────────────────────────────────────────┐
│       业务服务层 (Service Layer)          │
│  Auth | Device | Telemetry | OTA | Rule │
└─────────────────────────────────────────┘
                    ↓ 数据持久化
┌─────────────────────────────────────────┐
│        数据存储层 (Data Layer)            │
│  PostgreSQL | TimescaleDB | Redis | MinIO│
└─────────────────────────────────────────┘
```

详细架构设计请查看：[ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4 核 8GB 内存（推荐 8 核 16GB）
- 磁盘空间 50GB+

### 一键启动（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-org/iot-platform.git
cd iot-platform

# 2. 快速启动 Phase 1（MVP 核心功能）
make quick-start
```

就是这么简单！系统会自动：
- ✅ 初始化项目结构
- ✅ 创建 Docker 网络
- ✅ 启动所有基础设施
- ✅ 启动 Phase 1 核心服务
- ✅ 等待服务就绪

### 访问地址

启动成功后，访问以下地址：

| 服务 | 地址 | 说明 |
|------|------|------|
| **前端控制台** | http://localhost:3000 | 主控制台界面 |
| **EMQX 控制台** | http://localhost:18083 | MQTT 管理界面 (admin/public2025) |
| **MinIO 控制台** | http://localhost:9001 | 对象存储管理 (minio_admin/minio_password_2025) |
| **NATS 监控** | http://localhost:8222 | NATS 状态监控 |
| **Grafana** | http://localhost:3001 | 监控面板 (Phase 3) |
| **Prometheus** | http://localhost:9090 | 指标监控 (Phase 3) |

---

## 📦 分阶段部署

本项目采用**渐进式部署**策略，避免一次性搭建过于复杂的系统。

### Phase 1: MVP 核心功能 ⭐

**目标**: 支持 MQTT 设备 + 基础监控 + OTA 升级

```bash
make start-phase1
```

**包含服务**:
- ✅ auth-service（认证服务）
- ✅ device-service（设备管理）
- ✅ telemetry-service（数据采集）
- ✅ ota-service（固件升级）
- ✅ config-service（配置中心）
- ✅ frontend（前端界面）

**支持设备**: ESP32/STM32 通过 MQTT (WiFi/4G/5G)

---

### Phase 2: 多租户 + 多协议 ⭐⭐

**目标**: 完整 SaaS 功能 + LoRa/NB-IoT 支持

```bash
make start-phase2
```

**新增服务**:
- ✅ tenant-service（租户管理）
- ✅ protocol-gateway（协议网关）
- ✅ rule-engine（规则引擎）
- ✅ alarm-service（告警系统）

**支持设备**: + LoRa/NB-IoT 设备

---

### Phase 3: 高级功能 + 监控 ⭐⭐⭐

**目标**: 视频流 + 数据分析 + 完整监控

```bash
make start-phase3
```

**新增服务**:
- ✅ stream-service（视频流处理）
- ✅ analytics-service（数据分析）
- ✅ prometheus（指标监控）
- ✅ grafana（可视化）
- ✅ loki（日志聚合）

**支持设备**: 全部类型（包括视频流设备）

---

## 🛠️ 常用命令

项目提供了完整的 Makefile，简化所有操作：

### 启动与停止

```bash
make start-phase1      # 启动 Phase 1
make start-phase2      # 启动 Phase 2
make start-phase3      # 启动 Phase 3（包含前面所有）
make start-all         # 启动所有服务

make stop-phase1       # 停止 Phase 1
make stop-all          # 停止所有服务

make restart-phase1    # 重启 Phase 1
```

### 日志查看

```bash
make logs              # 查看所有日志
make logs-phase1       # 查看 Phase 1 日志
make logs-auth         # 查看认证服务日志
make logs-device       # 查看设备服务日志
make logs-gateway      # 查看协议网关日志
```

### 健康检查

```bash
make health            # 检查所有服务状态
make health-phase1     # 检查 Phase 1 服务状态
make test-api          # 测试 API 连接
make test-mqtt         # 测试 MQTT 连接
```

### 数据库管理

```bash
make db-migrate        # 运行数据库迁移
make db-seed           # 填充初始数据
make db-reset          # 重置数据库（危险）
```

### 开发工具

```bash
make shell-auth        # 进入认证服务容器
make shell-device      # 进入设备服务容器
make shell-postgres    # 进入 PostgreSQL
make shell-redis       # 进入 Redis
```

### 监控面板

```bash
make dashboard         # 打开所有管理面板
make open-frontend     # 打开前端界面
make open-emqx         # 打开 EMQX 控制台
make open-grafana      # 打开 Grafana
```

### 构建与更新

```bash
make build-all         # 构建所有服务镜像
make build-phase1      # 构建 Phase 1 服务
make pull              # 拉取最新镜像
```

### 清理

```bash
make clean-logs        # 清理日志文件
make clean-images      # 删除未使用的镜像
make clean-volumes     # 删除所有数据卷（危险）
make clean-all         # 完全清理（危险）
```

### 备份与恢复

```bash
make backup            # 备份数据
make restore FILE=xxx  # 恢复数据
```

### 系统信息

```bash
make info              # 显示系统信息
make version           # 显示项目版本
make help              # 显示帮助信息
```

---

## 📖 文档目录

完整文档位于 `docs/` 目录：

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构设计文档 |
| [DATA_FLOW.md](docs/DATA_FLOW.md) | 数据流设计 |
| [PROTOCOL_GATEWAY.md](docs/PROTOCOL_GATEWAY.md) | 协议网关设计 |
| [GETTING_STARTED.md](docs/GETTING_STARTED.md) | 快速入门指南 |
| [API.md](docs/API.md) | API 文档 |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | 开发指南 |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 部署指南 |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | 故障排查 |

---

## 🔧 配置说明

### 环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
vim .env
```

**重要配置**:

```bash
# 数据库密码（必改）
POSTGRES_PASSWORD=your_strong_password
TIMESCALEDB_PASSWORD=your_strong_password
REDIS_PASSWORD=your_strong_password

# JWT 密钥（必改，至少 32 字符）
JWT_SECRET=your_jwt_secret_min_32_chars

# EMQX 管理员密码（必改）
EMQX_ADMIN_PASSWORD=your_strong_password

# MinIO 密码（必改）
MINIO_ROOT_PASSWORD=your_strong_password
```

**⚠️ 生产环境请务必修改所有默认密码！**

---

## 🧪 开发指南

### 项目结构

```
/opt/iot-platform
├── backend/                 # 后端微服务
│   ├── auth-service/       # 认证服务
│   ├── device-service/     # 设备服务
│   ├── telemetry-service/  # 遥测服务
│   ├── ota-service/        # OTA 服务
│   ├── tenant-service/     # 租户服务
│   ├── protocol-gateway/   # 协议网关
│   ├── rule-engine/        # 规则引擎
│   ├── alarm-service/      # 告警服务
│   ├── stream-service/     # 视频流服务
│   └── analytics-service/  # 数据分析服务
├── frontend/               # 前端项目
├── docs/                   # 文档
├── configs/                # 配置文件
│   ├── postgres/
│   ├── emqx/
│   ├── prometheus/
│   └── grafana/
├── data/                   # 数据持久化（运行时生成）
├── docker-compose.yml      # 基础设施
├── docker-compose.phase1.yml   # Phase 1 服务
├── docker-compose.phase2.yml   # Phase 2 服务
├── docker-compose.phase3.yml   # Phase 3 服务
├── Makefile                # 管理脚本
├── .env.example            # 环境变量模板
└── README.md               # 本文件
```

### 本地开发

每个微服务都可以独立开发：

```bash
# 进入服务目录
cd backend/auth-service

# 安装依赖
npm install

# 本地运行
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

详细开发指南请查看：[DEVELOPMENT.md](docs/DEVELOPMENT.md)

---

## 🎯 使用场景

### 1. 智能家居

- 支持 WiFi 设备（智能开关、传感器）
- 实时监控与控制
- 场景联动与自动化

### 2. 工业监控

- 支持 Modbus 工业设备
- 数据采集与分析
- 告警与预警

### 3. 农业物联网

- 支持 LoRa 远距离设备
- 环境监测
- 自动灌溉控制

### 4. 车联网

- 支持 4G/5G 设备
- 实时定位与追踪
- 远程诊断

### 5. 视频监控

- 支持 RTSP/WebRTC 视频流
- 录像存储与回放
- AI 分析（Phase 3）

---

## 🔒 安全性

### 认证机制

- **用户认证**: JWT Token
- **设备认证**: Device Token / MQTT ClientID
- **服务间认证**: mTLS (可选)

### 数据加密

- **传输加密**: HTTPS + MQTT/TLS + WebSocket Secure
- **存储加密**: 数据库字段加密（敏感数据）
- **密钥管理**: Vault (可选)

### 多租户隔离

- **数据库隔离**: Schema-per-Tenant
- **Redis 隔离**: Namespace
- **NATS 隔离**: Subject 权限控制

---

## 📊 性能指标

### 吞吐量

- MQTT 消息：100,000+ msg/s
- HTTP API：10,000+ req/s
- 并发设备：100,000+ 连接

### 延迟

- MQTT 端到端：< 100ms
- HTTP API 响应：< 50ms
- WebSocket 推送：< 50ms

### 扩展性

- 单机：10 万设备
- 集群：百万级设备（Kubernetes 部署）

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

详细指南请查看：[CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

感谢以下开源项目：

- [EMQX](https://www.emqx.io/) - MQTT Broker
- [NATS](https://nats.io/) - 消息总线
- [Fastify](https://www.fastify.io/) - Web 框架
- [Next.js](https://nextjs.org/) - React 框架
- [TimescaleDB](https://www.timescale.com/) - 时序数据库
- [MinIO](https://min.io/) - 对象存储

---

## 📧 联系方式

- 项目主页：https://github.com/your-org/iot-platform
- 问题反馈：https://github.com/your-org/iot-platform/issues
- 邮箱：support@iot-platform.com

---

## 🗺️ 路线图

### Phase 1: MVP (已完成) ✅
- [x] 基础设施搭建
- [x] MQTT 设备接入
- [x] 设备管理
- [x] 数据采集
- [x] OTA 升级
- [x] 前端控制台

### Phase 2: 扩展功能 (进行中) 🚧
- [ ] 多租户管理
- [ ] 协议网关（LoRa/NB-IoT）
- [ ] 规则引擎
- [ ] 告警系统

### Phase 3: 高级功能 (规划中) 📋
- [ ] 视频流处理
- [ ] 数据分析
- [ ] 完整监控栈
- [ ] AI 预测

### Phase 4: 云原生化 (未来) 🚀
- [ ] Kubernetes 部署
- [ ] Helm Charts
- [ ] ArgoCD CI/CD
- [ ] 多区域容灾

---

<p align="center">
  Made with ❤️ by Fountain IoT Team
</p>

<p align="center">
  <a href="https://github.com/your-org/iot-platform">⭐ Star us on GitHub</a>
</p>
