# Auth Service

> 认证与授权服务 - Fountain IoT Platform

## 📋 功能概述

auth-service 是 IoT 平台的认证与授权服务，负责：

- ✅ 用户认证（JWT Token）
- ✅ 设备认证（Device Token）
- ✅ 权限管理（RBAC）
- ✅ MQTT 认证 Hook
- ✅ 会话管理
- ✅ Token 刷新
- ✅ 多租户隔离

## 🔧 技术栈

- **框架**: Fastify 4.x
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **缓存**: Redis
- **消息**: NATS
- **认证**: JWT + bcrypt

## 📦 依赖服务

- postgres (主数据库)
- redis (会话存储)
- nats (事件总线)

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
npm run dev
```

### Docker 部署

```bash
# 构建镜像
docker build -t iot-platform/auth-service .

# 运行容器
docker run -p 8001:8001 \
  -e POSTGRES_HOST=postgres \
  -e REDIS_HOST=redis \
  -e NATS_URL=nats://nats:4222 \
  iot-platform/auth-service
```

## 📡 API 端点

### 用户认证

```
POST   /api/v1/auth/register      注册用户
POST   /api/v1/auth/login         用户登录
POST   /api/v1/auth/logout        用户登出
POST   /api/v1/auth/refresh       刷新 Token
GET    /api/v1/auth/me            获取当前用户信息
```

### 设备认证

```
POST   /api/v1/devices/register   注册设备
POST   /api/v1/devices/token      生成设备 Token
DELETE /api/v1/devices/:id/token  撤销设备 Token
```

### MQTT 认证 Hook

```
POST   /api/v1/mqtt/auth          MQTT 认证
POST   /api/v1/mqtt/acl           MQTT ACL 验证
POST   /api/v1/mqtt/superuser     MQTT 超级用户验证
```

### 健康检查

```
GET    /health                    健康检查
GET    /metrics                   Prometheus 指标
```

## 🔐 认证流程

### 用户认证流程

```
1. 用户提交 email + password
2. 验证凭证
3. 生成 JWT Token (Access Token + Refresh Token)
4. 存储会话到 Redis
5. 返回 Token
```

### 设备认证流程

```
1. 设备注册（获取 Device ID）
2. 生成 Device Token
3. 设备使用 Token 连接 MQTT
4. EMQX 调用 /mqtt/auth 验证
5. 验证成功，允许连接
```

## 📊 数据库表结构

### users 表

```sql
CREATE TABLE tenant_xxx.users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### devices 表

```sql
CREATE TABLE tenant_xxx.devices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255),
  status VARCHAR(20) DEFAULT 'offline',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔑 环境变量

```bash
# 服务配置
NODE_ENV=development
PORT=8001
LOG_LEVEL=info

# 数据库
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=iot_platform
POSTGRES_USER=iot_user
POSTGRES_PASSWORD=your_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# NATS
NATS_URL=nats://nats:4222

# JWT
JWT_SECRET=your_secret_min_32_chars
JWT_EXPIRES_IN=7200
JWT_REFRESH_EXPIRES_IN=604800
```

## 🧪 测试

```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 单元测试
npm run test:unit

# 集成测试
npm run test:integration
```

## 📈 监控指标

服务暴露以下 Prometheus 指标：

```
# HTTP 请求指标
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}

# 认证指标
auth_login_total{status}
auth_login_duration_seconds
auth_token_generated_total
auth_token_validated_total

# 业务指标
active_users_total
active_devices_total
```

## 🔧 开发指南

### 添加新的认证方式

1. 在 `src/strategies/` 下创建新策略
2. 实现 `AuthStrategy` 接口
3. 注册到 `src/auth/index.ts`

### 添加新的 API 端点

1. 在 `src/routes/` 下创建路由文件
2. 定义 schema 和 handler
3. 注册到主应用

### 数据库迁移

```bash
# 创建迁移
npm run migrate:create

# 运行迁移
npm run migrate

# 回滚迁移
npm run migrate:rollback
```

## 🐛 故障排查

### 常见问题

**Q: JWT Token 验证失败**
```bash
# 检查 JWT_SECRET 是否一致
# 检查 Token 是否过期
# 查看日志：make logs-auth
```

**Q: 数据库连接失败**
```bash
# 检查 PostgreSQL 是否启动
docker compose ps postgres

# 检查网络连接
docker compose exec auth-service ping postgres
```

**Q: Redis 连接失败**
```bash
# 检查 Redis 是否启动
docker compose ps redis

# 测试连接
docker compose exec auth-service redis-cli -h redis ping
```

## 📚 相关文档

- [架构设计](../../docs/ARCHITECTURE.md)
- [API 文档](../../docs/API.md)
- [安全指南](../../docs/SECURITY.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📝 更新日志

### v1.0.0 (2025-10-12)
- ✅ 初始版本
- ✅ 用户认证
- ✅ 设备认证
- ✅ MQTT Hook
- ✅ 多租户支持

---

**维护者**: Fountain IoT Team  
**状态**: ✅ Phase 1 Ready

