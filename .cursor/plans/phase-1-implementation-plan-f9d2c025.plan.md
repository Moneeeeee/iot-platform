<!-- f9d2c025-a7a7-42a5-afa7-6c7b98b5f3c5 7f3423a9-8c71-4113-afe4-dbba31eaf22d -->
# auth-service 实施计划

## 目标

实现完整的认证服务，支持用户登录、JWT 认证、设备 Token 管理和 MQTT Auth Hook，为整个 IoT 平台提供安全认证基础。

## 技术栈

- **框架**: Fastify 4.x + TypeScript
- **数据库**: PostgreSQL 16（租户隔离）
- **缓存**: Redis 7（会话管理）
- **认证**: JWT (jsonwebtoken)
- **密码**: bcrypt
- **验证**: Zod
- **日志**: Pino

## 实施步骤

### 第一阶段：项目初始化 (30分钟)

#### 1.1 创建项目结构

```
backend/auth-service/
├── src/
│   ├── config/           # 配置管理
│   ├── routes/           # 路由定义
│   ├── services/         # 业务逻辑
│   ├── middleware/       # 中间件
│   ├── models/           # 数据模型
│   ├── utils/            # 工具函数
│   ├── types/            # TypeScript 类型
│   └── server.ts         # 服务入口
├── tests/                # 测试文件
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
└── README.md
```

#### 1.2 安装依赖包

```json
{
  "dependencies": {
    "fastify": "^4.24.0",
    "@fastify/cors": "^8.4.0",
    "@fastify/helmet": "^11.1.1",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "pg": "^8.11.3",
    "ioredis": "^5.3.2",
    "zod": "^3.22.4",
    "pino": "^8.16.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "@types/node": "^20.8.0",
    "@types/bcrypt": "^5.0.1",
    "@types/jsonwebtoken": "^9.0.4",
    "tsx": "^3.14.0",
    "vitest": "^0.34.6"
  }
}
```

#### 1.3 配置文件

- `tsconfig.json`: TypeScript 编译配置
- `.env.example`: 环境变量模板
- `Dockerfile`: 多阶段构建

**验收标准**:

- ✅ 项目结构完整
- ✅ 依赖安装成功
- ✅ TypeScript 编译通过

---

### 第二阶段：数据库模型与配置 (1小时)

#### 2.1 数据库连接

```typescript
// src/config/database.ts
import { Pool } from 'pg';

export const createDbPool = () => {
  return new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
  });
};
```

#### 2.2 Redis 连接

```typescript
// src/config/redis.ts
import Redis from 'ioredis';

export const createRedisClient = () => {
  return new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 0,
    keyPrefix: 'auth:',
  });
};
```

#### 2.3 数据模型定义

```typescript
// src/types/user.ts
export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'operator' | 'viewer';
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

// src/types/device-token.ts
export interface DeviceToken {
  id: string;
  device_id: string;
  tenant_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}
```

**验收标准**:

- ✅ 数据库连接池创建成功
- ✅ Redis 客户端连接成功
- ✅ 类型定义完整

---

### 第三阶段：核心工具函数 (1小时)

#### 3.1 JWT 工具

```typescript
// src/utils/jwt.ts
import jwt from 'jsonwebtoken';

export const generateToken = (payload: object, expiresIn = '7d'): string;
export const verifyToken = (token: string): Promise<any>;
export const refreshToken = (oldToken: string): Promise<string>;
```

#### 3.2 密码工具

```typescript
// src/utils/password.ts
import bcrypt from 'bcrypt';

export const hashPassword = (password: string): Promise<string>;
export const comparePassword = (password: string, hash: string): Promise<boolean>;
```

#### 3.3 设备 Token 生成

```typescript
// src/utils/device-token.ts
import crypto from 'crypto';

export const generateDeviceToken = (): string;
export const hashDeviceToken = (token: string): Promise<string>;
```

**验收标准**:

- ✅ JWT 生成和验证正确
- ✅ 密码哈希和比较正确
- ✅ 设备 Token 生成唯一且安全

---

### 第四阶段：用户认证 API (2小时)

#### 4.1 用户注册

```
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "role": "operator",
  "tenant_id": "tenant_001"
}

Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "operator"
  }
}
```

**实现要点**:

- 邮箱格式验证（Zod）
- 密码强度验证（至少 8 位）
- 检查邮箱是否已存在
- 密码哈希存储
- 租户验证

#### 4.2 用户登录

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "operator",
    "tenant_id": "tenant_001"
  }
}
```

**实现要点**:

- 验证邮箱和密码
- 生成 JWT Token（有效期 7 天）
- 生成 Refresh Token（有效期 30 天）
- 存储会话到 Redis
- 返回用户信息

#### 4.3 Token 刷新

```
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>

Response:
{
  "success": true,
  "token": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

#### 4.4 获取用户信息

```
GET /api/v1/auth/profile
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "operator",
    "tenant_id": "tenant_001"
  }
}
```

#### 4.5 退出登录

```
POST /api/v1/auth/logout
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

**验收标准**:

- ✅ 用户可以成功注册
- ✅ 用户可以使用邮箱密码登录
- ✅ JWT Token 正确生成和验证
- ✅ Token 刷新机制正常
- ✅ 用户信息查询正确
- ✅ 退出登录清除会话

---

### 第五阶段：设备 Token 管理 (1.5小时)

#### 5.1 生成设备 Token

```
POST /api/v1/auth/devices/token
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "device_id": "esp32_001",
  "tenant_id": "tenant_001",
  "expires_in": "365d"
}

Response:
{
  "success": true,
  "token": "dt_abc123def456...",
  "device_id": "esp32_001",
  "expires_at": "2026-01-01T00:00:00Z"
}
```

**实现要点**:

- 生成唯一的设备 Token（前缀 `dt_`）
- 哈希存储到数据库
- 设置过期时间
- 关联租户和设备

#### 5.2 验证设备 Token

```
POST /api/v1/auth/devices/verify
Content-Type: application/json

{
  "device_id": "esp32_001",
  "token": "dt_abc123def456..."
}

Response:
{
  "success": true,
  "valid": true,
  "device_id": "esp32_001",
  "tenant_id": "tenant_001"
}
```

#### 5.3 撤销设备 Token

```
DELETE /api/v1/auth/devices/token/:deviceId
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "message": "Device token revoked"
}
```

#### 5.4 列出设备 Tokens

```
GET /api/v1/auth/devices/tokens
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "tokens": [
    {
      "device_id": "esp32_001",
      "created_at": "2025-01-01T00:00:00Z",
      "expires_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**验收标准**:

- ✅ 设备 Token 生成唯一且安全
- ✅ Token 验证正确
- ✅ Token 撤销生效
- ✅ Token 列表查询正确

---

### 第六阶段：MQTT Auth Hook (2小时)

#### 6.1 MQTT 认证端点

```
POST /api/v1/mqtt/auth
Content-Type: application/json

{
  "clientid": "tenant_001:esp32_001",
  "username": "esp32_001",
  "password": "dt_abc123def456..."
}

Response:
{
  "result": "allow",
  "is_superuser": false
}
// 或
{
  "result": "deny",
  "reason": "Invalid credentials"
}
```

**实现要点**:

- 解析 ClientID 格式：`{tenant_id}:{device_id}`
- 验证设备 Token（password 字段）
- 检查设备是否存在且已激活
- 返回 EMQX 期望的格式

#### 6.2 MQTT ACL 端点

```
POST /api/v1/mqtt/acl
Content-Type: application/json

{
  "clientid": "tenant_001:esp32_001",
  "username": "esp32_001",
  "topic": "iot/tenant_001/esp32_001/telemetry",
  "action": "publish"
}

Response:
{
  "result": "allow"
}
// 或
{
  "result": "deny"
}
```

**ACL 规则**:

- 设备只能发布到：`iot/{tenant_id}/{device_id}/*`
- 设备只能订阅到：`iot/{tenant_id}/{device_id}/command`
- 阻止跨租户访问
- 阻止访问其他设备的 Topic

**验收标准**:

- ✅ MQTT 认证端点正常工作
- ✅ 设备使用正确 Token 可以连接
- ✅ 错误的 Token 被拒绝
- ✅ ACL 规则正确限制设备权限
- ✅ EMQX 集成测试通过

---

### 第七阶段：RBAC 权限中间件 (1.5小时)

#### 7.1 认证中间件

```typescript
// src/middleware/auth.middleware.ts
export const requireAuth = async (request, reply) => {
  const token = extractToken(request.headers.authorization);
  const user = await verifyToken(token);
  request.user = user;
};
```

#### 7.2 角色检查中间件

```typescript
// src/middleware/rbac.middleware.ts
export const requireRole = (roles: string[]) => {
  return async (request, reply) => {
    if (!roles.includes(request.user.role)) {
      throw new Error('Insufficient permissions');
    }
  };
};
```

#### 7.3 租户隔离中间件

```typescript
// src/middleware/tenant.middleware.ts
export const requireTenant = async (request, reply) => {
  const tenantId = request.params.tenantId || request.body.tenant_id;
  if (tenantId !== request.user.tenant_id && request.user.role !== 'admin') {
    throw new Error('Access denied');
  }
};
```

**角色权限矩阵**:

| 操作 | Admin | Operator | Viewer |

|------|-------|----------|--------|

| 创建用户 | ✅ | ❌ | ❌ |

| 管理设备 | ✅ | ✅ | ❌ |

| 查看数据 | ✅ | ✅ | ✅ |

| 生成 Token | ✅ | ✅ | ❌ |

**验收标准**:

- ✅ 认证中间件正确验证 Token
- ✅ 角色权限正确限制
- ✅ 租户隔离生效
- ✅ 未授权访问被拒绝

---

### 第八阶段：健康检查与监控 (30分钟)

#### 8.1 健康检查端点

```
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2025-10-13T10:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

#### 8.2 Prometheus 指标

```
GET /metrics

Response:
# TYPE auth_requests_total counter
auth_requests_total{method="POST",path="/api/v1/auth/login",status="200"} 150
# TYPE auth_login_duration_seconds histogram
auth_login_duration_seconds_bucket{le="0.1"} 145
```

**验收标准**:

- ✅ 健康检查端点响应正确
- ✅ 数据库和 Redis 状态检测
- ✅ Prometheus 指标导出

---

### 第九阶段：Docker 容器化 (1小时)

#### 9.1 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 8001
CMD ["node", "dist/server.js"]
```

#### 9.2 更新 docker-compose.phase1.yml

```yaml
auth-service:
  build: ./backend/auth-service
  container_name: iot-auth-service
  restart: unless-stopped
  networks:
    - iot-net
  ports:
    - "8001:8001"
  environment:
    - NODE_ENV=production
    - POSTGRES_HOST=postgres
    - REDIS_HOST=redis
    - JWT_SECRET=${JWT_SECRET}
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:8001/health"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**验收标准**:

- ✅ Docker 镜像构建成功
- ✅ 容器启动正常
- ✅ 健康检查通过
- ✅ 可以访问 API 端点

---

### 第十阶段：集成测试 (2小时)

#### 10.1 单元测试

- JWT 工具函数测试
- 密码哈希测试
- 数据验证测试

#### 10.2 集成测试

```typescript
// tests/integration/auth.test.ts
describe('Auth API', () => {
  test('User registration', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'Test123456',
      role: 'operator',
      tenant_id: 'tenant_001'
    });
    expect(response.status).toBe(201);
  });

  test('User login', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'test@example.com',
      password: 'Test123456'
    });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

#### 10.3 MQTT 集成测试

```bash
# 测试 MQTT 认证
docker run --rm --network iot-net eclipse-mosquitto \
  mosquitto_pub \
  -h emqx \
  -t "iot/tenant_001/esp32_001/telemetry" \
  -m '{"temperature": 25.5}' \
  -i "tenant_001:esp32_001" \
  -u "esp32_001" \
  -P "dt_device_token_here"
```

**验收标准**:

- ✅ 所有单元测试通过
- ✅ 集成测试通过（注册、登录、Token）
- ✅ MQTT 认证测试通过
- ✅ 测试覆盖率 > 70%

---

### 第十一阶段：文档更新 (30分钟)

#### 11.1 更新 SERVICE_STATUS.md

- auth-service 状态改为"✅ 完成"
- 记录完成时间和实现功能

#### 11.2 创建 API 文档

```markdown
# auth-service API 文档

## 用户认证
- POST /api/v1/auth/register - 用户注册
- POST /api/v1/auth/login - 用户登录
- POST /api/v1/auth/refresh - 刷新 Token
- POST /api/v1/auth/logout - 退出登录
- GET /api/v1/auth/profile - 获取用户信息

## 设备 Token
- POST /api/v1/auth/devices/token - 生成设备 Token
- POST /api/v1/auth/devices/verify - 验证设备 Token
- DELETE /api/v1/auth/devices/token/:deviceId - 撤销 Token
- GET /api/v1/auth/devices/tokens - 列出 Tokens

## MQTT Hook
- POST /api/v1/mqtt/auth - MQTT 认证
- POST /api/v1/mqtt/acl - MQTT ACL

## 健康检查
- GET /health - 健康检查
- GET /metrics - Prometheus 指标
```

#### 11.3 更新 README.md

添加 auth-service 的使用说明和配置说明

**验收标准**:

- ✅ SERVICE_STATUS.md 更新
- ✅ API 文档完整
- ✅ README 更新

---

## 时间估算

| 阶段 | 任务 | 预估时间 |

|------|------|---------|

| 1 | 项目初始化 | 0.5h |

| 2 | 数据库模型与配置 | 1h |

| 3 | 核心工具函数 | 1h |

| 4 | 用户认证 API | 2h |

| 5 | 设备 Token 管理 | 1.5h |

| 6 | MQTT Auth Hook | 2h |

| 7 | RBAC 权限中间件 | 1.5h |

| 8 | 健康检查与监控 | 0.5h |

| 9 | Docker 容器化 | 1h |

| 10 | 集成测试 | 2h |

| 11 | 文档更新 | 0.5h |

**总计**: 约 **13.5 小时**（约 2 个工作日）

---

## 成功指标

完成后，auth-service 应该：

### 功能指标

- ✅ 用户可以注册和登录
- ✅ JWT Token 正确生成和验证
- ✅ 设备 Token 可以生成和管理
- ✅ EMQX 可以通过 auth-service 验证设备
- ✅ RBAC 权限正确限制访问
- ✅ 租户数据完全隔离

### 性能指标

- ✅ 登录响应时间 < 100ms
- ✅ Token 验证时间 < 10ms
- ✅ MQTT 认证响应 < 50ms
- ✅ 支持 1000+ 并发认证请求

### 质量指标

- ✅ 测试覆盖率 > 70%
- ✅ 所有 API 有正确的错误处理
- ✅ 日志记录完整
- ✅ 无内存泄漏

---

## 风险与缓解

### 风险 1：JWT 密钥安全

- **缓解**: 使用强密钥（至少 32 字符），存储在环境变量
- **验证**: 定期轮换密钥机制

### 风险 2：密码存储安全

- **缓解**: 使用 bcrypt（salt rounds = 10）
- **验证**: 密码永远不以明文记录

### 风险 3：MQTT 认证性能

- **缓解**: Redis 缓存设备 Token 验证结果
- **验证**: 压力测试 10000 次/秒认证请求

### 风险 4：租户数据泄露

- **缓解**: 所有 SQL 查询都包含 tenant_id 过滤
- **验证**: 渗透测试跨租户访问

---

## 依赖关系

**auth-service 依赖**:

- ✅ PostgreSQL (已就绪)
- ✅ Redis (已就绪)
- ✅ EMQX (已就绪，等待认证集成)

**依赖 auth-service 的服务**:

- device-service (需要 Token 验证)
- telemetry-service (需要 Token 验证)
- ota-service (需要 Token 验证)
- frontend (需要用户登录)

---

## 下一步

完成 auth-service 后，按计划实现：

1. **device-service** - 设备注册和管理
2. **protocol-gateway** - MQTT 适配器
3. **telemetry-service** - 数据采集
4. **ota-service** - 固件升级
5. **frontend** - 前端界面

每个服务都会按照类似的流程：初始化 → 核心功能 → 测试 → 容器化 → 文档。

### To-dos

- [ ] 项目初始化：创建目录结构、安装依赖、配置 TypeScript
- [ ] 数据库配置：PostgreSQL 和 Redis 连接，数据模型定义
- [ ] 核心工具：JWT、密码哈希、设备 Token 生成工具函数
- [ ] 用户认证 API：注册、登录、刷新、获取信息、退出
- [ ] 设备 Token 管理：生成、验证、撤销、列表查询
- [ ] MQTT Auth Hook：实现 /mqtt/auth 和 /mqtt/acl 端点
- [ ] RBAC 中间件：认证、角色检查、租户隔离中间件
- [ ] 健康检查与监控：/health 端点和 Prometheus 指标
- [ ] Docker 容器化：Dockerfile、docker-compose 配置、镜像构建
- [ ] 集成测试：单元测试、API 测试、MQTT 认证测试
- [ ] 文档更新：SERVICE_STATUS.md、API 文档、README