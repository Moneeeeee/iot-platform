# auth-service

认证服务 - Fountain IoT Platform 的核心安全基础服务。

## 功能特性

- ✅ 用户注册和登录
- ✅ JWT Token 生成和验证
- ✅ 设备 Token 管理
- ✅ MQTT 认证 Hook（EMQX 集成）
- ✅ RBAC 权限控制
- ✅ 多租户隔离

## 技术栈

- **框架**: Fastify 4.x + TypeScript
- **数据库**: PostgreSQL 16
- **缓存**: Redis 7
- **认证**: JWT (jsonwebtoken)
- **密码**: bcrypt

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 构建生产版本

```bash
npm run build
npm start
```

## API 端点

### 用户认证

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录  
- `POST /api/v1/auth/refresh` - 刷新 Token
- `POST /api/v1/auth/logout` - 退出登录
- `GET /api/v1/auth/profile` - 获取用户信息

### 设备 Token

- `POST /api/v1/auth/devices/token` - 生成设备 Token
- `POST /api/v1/auth/devices/verify` - 验证设备 Token
- `DELETE /api/v1/auth/devices/token/:deviceId` - 撤销 Token
- `GET /api/v1/auth/devices/tokens` - 列出 Tokens

### MQTT Hook

- `POST /api/v1/mqtt/auth` - MQTT 认证
- `POST /api/v1/mqtt/acl` - MQTT ACL

### 健康检查

- `GET /health` - 健康检查
- `GET /metrics` - Prometheus 指标

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | 8001 |
| `POSTGRES_HOST` | PostgreSQL 主机 | postgres |
| `REDIS_HOST` | Redis 主机 | redis |
| `JWT_SECRET` | JWT 密钥 | - |

## Docker 部署

```bash
# 构建镜像
docker build -t iot-platform/auth-service:latest .

# 运行容器
docker run -d \
  -p 8001:8001 \
  -e POSTGRES_HOST=postgres \
  -e REDIS_HOST=redis \
  -e JWT_SECRET=your_secret \
  iot-platform/auth-service:latest
```

## 开发

### 运行测试

```bash
npm test
```

### 测试覆盖率

```bash
npm run test:coverage
```

## 角色权限

| 操作 | Admin | Operator | Viewer |
|------|-------|----------|--------|
| 创建用户 | ✅ | ❌ | ❌ |
| 管理设备 | ✅ | ✅ | ❌ |
| 查看数据 | ✅ | ✅ | ✅ |
| 生成 Token | ✅ | ✅ | ❌ |

## 许可证

MIT
