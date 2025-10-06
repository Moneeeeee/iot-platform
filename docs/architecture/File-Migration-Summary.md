# 文件迁移总结

## 📁 文件迁移对照表

在目录重组过程中，以下文件被移动到了新的位置：

### 1. **路由文件 (routes → api)**
```
旧位置: src/routes/
新位置: src/api/
```
- `auth.ts` → `api/auth.ts`
- `users.ts` → `api/users.ts`
- `devices.ts` → `api/devices.ts`
- `system.ts` → `api/system.ts`
- `powersafe.ts` → `api/powersafe.ts`
- `device-bootstrap.ts` → `api/device-bootstrap.ts`

### 2. **工具文件 (utils → common/utils)**
```
旧位置: src/utils/
新位置: src/common/utils/
```
- `logger.ts` → `common/logger.ts`
- 其他工具文件 → `common/utils/`

### 3. **类型定义 (models → common/types)**
```
旧位置: src/models/
新位置: src/common/types/
```
- 所有类型定义文件 → `common/types/`

### 4. **中间件 (middleware → core/middleware)**
```
旧位置: src/middleware/
新位置: src/core/middleware/
```
- `auth.ts` → `core/middleware/auth.ts`
- `tenant.ts` → `core/middleware/tenant.ts`
- `errorHandler.ts` → `core/middleware/errorHandler.ts`
- `rate-limiter/` → `core/middleware/rate-limiter/`
- `idempotency/` → `core/middleware/idempotency/`

### 5. **服务文件 (services → core)**
```
旧位置: src/services/
新位置: src/core/
```
- `mqtt.ts` → `core/mqtt.ts`
- `udp.ts` → `core/udp.ts`
- `websocket.ts` → `core/websocket.ts`
- `alert.ts` → `core/alert.ts`
- `health.ts` → `core/health.ts`
- `device-bootstrap.ts` → `core/bootstrap/device-bootstrap.ts`

### 6. **配置中心 (独立目录)**
```
旧位置: src/config-center/
新位置: src/config-center/
```
- 保持独立，但移到了 backend/src 下以符合 TypeScript 配置

### 7. **插件系统 (plugins → core + plugins)**
```
旧位置: src/plugins/
新位置: src/core/ + src/plugins/
```
- 插件接口和加载器 → `core/plugin-*.ts`
- 插件实现 → `plugins/tenants/` 和 `plugins/devices/`

## 🗂️ 新的目录结构

```
backend/src/
├── api/                    # API路由 (原 routes/)
│   ├── auth.ts
│   ├── users.ts
│   ├── devices.ts
│   ├── system.ts
│   ├── powersafe.ts
│   ├── device-bootstrap.ts
│   └── controllers/
├── common/                 # 公共工具和类型 (原 utils/ + models/)
│   ├── logger.ts          # 原 utils/logger.ts
│   ├── utils/             # 原 utils/
│   ├── types/             # 原 models/
│   └── config/            # 原 config/
├── core/                   # 核心框架
│   ├── server.ts          # Express主入口
│   ├── middleware/        # 原 middleware/
│   ├── db/                # 数据库和容器
│   ├── security/          # 认证和凭证
│   ├── bootstrap/         # 设备引导 (原 services/device-bootstrap.ts)
│   ├── shadow/            # 影子机制
│   ├── mqtt/              # MQTT封装
│   ├── mqtt.ts            # 原 services/mqtt.ts
│   ├── udp.ts             # 原 services/udp.ts
│   ├── websocket.ts       # 原 services/websocket.ts
│   ├── alert.ts           # 原 services/alert.ts
│   ├── health.ts          # 原 services/health.ts
│   └── plugin-*.ts        # 插件系统
├── plugins/               # 插件实现
│   ├── tenants/           # 租户插件
│   └── devices/           # 设备插件
├── config-center/         # 配置中心
├── tests/                 # 测试文件
├── app.ts                 # 旧应用文件 (保留)
└── index.ts               # 启动入口
```

## 🔄 导入路径更新

所有导入路径都已从 `@/` 别名更新为相对路径：

### 示例：
```typescript
// 旧导入
import { logger } from '@/utils/logger';
import { User } from '@/types';
import { prisma } from '@/config/database';

// 新导入
import { logger } from '../common/logger';
import { User } from '../common/types';
import { prisma } from '../common/config/database';
```

## ✅ 清理完成

以下空目录已被清理：
- `src/routes/` (文件已移至 `src/api/`)
- `src/utils/` (文件已移至 `src/common/utils/`)
- `src/models/` (文件已移至 `src/common/types/`)
- `src/middleware/` (文件已移至 `src/core/middleware/`)
- `src/services/` (文件已移至 `src/core/`)

## 🎯 优势

新的目录结构具有以下优势：

1. **清晰的模块分离** - 核心、插件、配置中心独立
2. **逻辑分组** - 相关功能放在同一目录下
3. **易于维护** - 统一的代码结构和依赖管理
4. **开发友好** - TypeScript 类型安全和统一接口
5. **可扩展性** - 插件化架构支持快速扩展

现在项目结构更加清晰和规范！🎉
