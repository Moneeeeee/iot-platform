# 快速入门指南

> 5 分钟快速启动 Fountain IoT Platform

---

## 📋 前置准备

### 系统要求

- **操作系统**: Linux (Ubuntu 20.04+), macOS, Windows (WSL2)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **内存**: 最少 8GB，推荐 16GB
- **CPU**: 最少 4 核，推荐 8 核
- **磁盘**: 50GB 可用空间

### 检查环境

```bash
# 检查 Docker 版本
docker --version
# 应该看到: Docker version 20.10.x 或更高

# 检查 Docker Compose 版本
docker compose version
# 应该看到: Docker Compose version v2.x.x 或更高

# 检查系统资源
free -h  # Linux
# 确保至少有 8GB 可用内存
```

---

## 🚀 第一步：克隆项目

```bash
# 克隆仓库
git clone https://github.com/your-org/iot-platform.git
cd iot-platform

# 或者直接在现有目录
cd /opt/iot-platform
```

---

## 🔧 第二步：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（可选，使用默认值也可以运行）
nano .env  # 或使用你喜欢的编辑器
```

**⚠️ 重要**：生产环境请务必修改以下密码：

```bash
POSTGRES_PASSWORD=your_strong_password
TIMESCALEDB_PASSWORD=your_strong_password
REDIS_PASSWORD=your_strong_password
JWT_SECRET=your_jwt_secret_min_32_characters
EMQX_ADMIN_PASSWORD=your_strong_password
MINIO_ROOT_PASSWORD=your_strong_password
```

---

## 🎯 第三步：一键启动

```bash
# 使用 Makefile 一键启动（推荐）
make quick-start
```

这个命令会自动：
1. 初始化项目结构
2. 创建 Docker 网络
3. 启动所有基础设施服务
4. 启动 Phase 1 核心服务
5. 等待所有服务就绪

**预计耗时**: 首次启动约 5-10 分钟（取决于网络速度）

---

## 📊 第四步：验证服务

### 检查服务状态

```bash
# 查看所有服务状态
make health

# 应该看到所有服务都是 "healthy" 状态
```

### 测试 API 连接

```bash
# 测试 API
make test-api

# 应该看到：
# ✓ Auth Service
# ✓ Device Service
# ✓ Telemetry Service
```

### 访问 Web 界面

打开浏览器访问：

| 服务 | 地址 | 用户名 | 密码 |
|------|------|--------|------|
| **前端控制台** | http://localhost:3000 | - | - |
| **EMQX 控制台** | http://localhost:18083 | admin | public2025 |
| **MinIO 控制台** | http://localhost:9001 | minio_admin | minio_password_2025 |
| **NATS 监控** | http://localhost:8222 | - | - |

---

## 🔌 第五步：连接第一个设备

### 1. 创建租户（通过前端）

访问 http://localhost:3000，创建你的第一个租户。

### 2. 注册设备

```bash
# 使用 API 注册设备
curl -X POST http://localhost:8003/api/v1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "deviceId": "esp32_001",
    "name": "测试设备",
    "type": "sensor",
    "protocol": "mqtt"
  }'

# 响应会包含设备 Token
```

### 3. 使用 MQTT 连接

```bash
# 使用 mosquitto_pub 测试
docker run --rm --network iot-net eclipse-mosquitto \
  mosquitto_pub \
  -h emqx \
  -t "iot/tenant_001/esp32_001/telemetry" \
  -m '{"temperature": 25.5, "humidity": 60}' \
  -u "esp32_001" \
  -P "DEVICE_TOKEN"
```

### 4. 查看数据

在前端控制台查看实时数据：http://localhost:3000/devices/esp32_001

---

## 📖 常用命令

### 日志查看

```bash
# 查看所有日志
make logs

# 查看特定服务日志
make logs-device
make logs-telemetry
make logs-auth

# 实时跟踪日志
make logs-phase1
```

### 服务管理

```bash
# 停止所有服务
make stop-all

# 重启 Phase 1
make restart-phase1

# 只启动基础设施
make start-infra
```

### 数据库管理

```bash
# 进入 PostgreSQL
make shell-postgres

# 进入 Redis
make shell-redis

# 查看 TimescaleDB 数据
make shell-postgres
# 然后连接：\c iot_timeseries
```

### 服务调试

```bash
# 进入服务容器
make shell-auth
make shell-device

# 查看服务健康状态
make health-phase1
```

---

## 🎨 下一步

### Phase 2: 启用多租户和多协议支持

```bash
make start-phase2
```

新增功能：
- ✅ 租户管理
- ✅ LoRa/NB-IoT 支持
- ✅ 规则引擎
- ✅ 告警系统

### Phase 3: 启用高级功能

```bash
make start-phase3
```

新增功能：
- ✅ 视频流处理
- ✅ 数据分析
- ✅ Grafana 监控
- ✅ 日志聚合

---

## ❓ 常见问题

### Q1: 端口被占用怎么办？

```bash
# 检查端口占用
sudo lsof -i :3000
sudo lsof -i :8001

# 修改 docker-compose.yml 中的端口映射
# 例如：将 "3000:3000" 改为 "3001:3000"
```

### Q2: 服务无法启动

```bash
# 查看日志
make logs

# 检查 Docker 资源
docker stats

# 清理并重启
make stop-all
make clean-volumes
make quick-start
```

### Q3: 数据库连接失败

```bash
# 等待数据库完全启动
make wait-infra

# 检查数据库状态
docker compose ps postgres
docker compose exec postgres pg_isready
```

### Q4: MQTT 连接失败

```bash
# 检查 EMQX 状态
docker compose ps emqx
docker compose logs emqx

# 测试 MQTT 连接
make test-mqtt
```

### Q5: 内存不足

```bash
# 检查 Docker 内存限制
docker info | grep Memory

# 调整 Docker Desktop 设置（如果使用）
# Settings → Resources → Memory → 增加到 8GB+
```

---

## 🔧 故障排查

### 完整的健康检查

```bash
# 1. 检查所有容器
docker compose ps

# 2. 检查网络
docker network inspect iot-net

# 3. 检查磁盘空间
df -h

# 4. 检查 Docker 日志
make logs | grep -i error

# 5. 重置环境（慎用）
make clean-all
make quick-start
```

### 性能优化

```bash
# 查看资源使用
docker stats

# 如果内存不足，可以只启动 Phase 1
make stop-all
make start-phase1
```

---

## 📚 更多文档

- [架构设计](ARCHITECTURE.md)
- [数据流设计](DATA_FLOW.md)
- [协议网关](PROTOCOL_GATEWAY.md)
- [API 文档](API.md)
- [开发指南](DEVELOPMENT.md)
- [部署指南](DEPLOYMENT.md)
- [故障排查](TROUBLESHOOTING.md)

---

## 💡 提示

### 最佳实践

1. **首次启动**：使用 `make quick-start`
2. **开发调试**：使用 `make logs` 实时查看日志
3. **生产部署**：修改所有默认密码
4. **定期备份**：使用 `make backup`
5. **监控状态**：定期运行 `make health`

### 开发建议

- 先从 Phase 1 开始，熟悉系统后再启用后续阶段
- 使用 `make help` 查看所有可用命令
- 阅读每个服务的 README 了解详细信息
- 加入社区讨论获取帮助

---

## 🎉 成功！

如果你看到这个消息，恭喜你成功启动了 Fountain IoT Platform！

现在你可以：
- ✅ 注册设备并连接 MQTT
- ✅ 查看实时数据
- ✅ 管理设备和用户
- ✅ 配置 OTA 升级

**下一步**：
1. 阅读 [API 文档](API.md) 了解如何集成
2. 查看 [开发指南](DEVELOPMENT.md) 了解如何扩展
3. 探索 EMQX 控制台管理 MQTT 连接

---

**需要帮助？**
- 📖 查看文档：[docs/](.)
- 🐛 报告问题：https://github.com/your-org/iot-platform/issues
- 💬 加入讨论：https://discord.gg/your-channel

<p align="center">
  Happy Coding! 🚀
</p>

