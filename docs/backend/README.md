# Backend 服务

## 📁 目录结构

```
backend/
├── src/                    # 源代码
│   ├── config/             # 配置管理
│   ├── controllers/        # 控制器
│   ├── middleware/         # 中间件
│   ├── models/             # 数据模型
│   ├── protocols/          # 通信协议
│   ├── routes/             # 路由定义
│   ├── services/           # 业务服务
│   ├── types/              # 类型定义
│   ├── utils/              # 工具函数
│   ├── tests/              # 单元测试
│   ├── index.ts            # 主入口文件
│   └── migrate-and-start.ts # 数据库迁移启动
├── scripts/                # 脚本文件
│   ├── test/               # 测试脚本
│   │   └── test-db.js      # 数据库测试
│   ├── debug/              # 调试脚本
│   │   ├── start-simple.js # 简单启动
│   │   ├── start-full.js   # 完整启动
│   │   ├── db-test-server.ts
│   │   ├── debug-server.ts
│   │   ├── minimal-db-server.ts
│   │   ├── simple-server.ts
│   │   └── step-by-step-server.ts
│   └── demo/               # 演示脚本
│       └── create-demo-users.js # 创建演示用户
├── prisma/                 # 数据库模式
├── dist/                   # 编译输出
├── node_modules/           # 依赖包
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
├── Dockerfile              # Docker配置
└── README.md               # 本文件
```

## 🚀 快速开始

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 数据库迁移
npm run migrate

# 生成Prisma客户端
npm run generate
```

### 生产环境
```bash
# 构建项目
npm run build

# 启动生产服务器
npm start
```

## 🔧 配置管理

Backend使用统一的配置管理系统：

### 配置文件位置
- **开发环境**: `docker/backend/config.json`
- **生产环境**: `docker/backend/config.prod.json`

### 配置加载
```typescript
import { configManager } from '@/config/config';

// 获取配置
const dbConfig = configManager.get('database');
const mqttConfig = configManager.get('mqtt');
```

## 📊 核心功能

### 1. 数据库管理
- **数据模型**: 基于Prisma ORM的完整数据模型
- **类型安全**: 自动生成的TypeScript类型
- **迁移管理**: 数据库结构版本控制
- **详细文档**: [数据库模式文档](./database-schema.md)

### 2. 设备管理
- 设备注册和认证
- 设备状态监控
- 设备数据收集

### 3. 用户管理
- 用户注册和登录
- JWT认证
- 权限控制

### 4. 数据管理
- 实时数据存储
- 历史数据查询
- 数据统计分析

### 5. MQTT通信
- MQTT消息处理
- 设备通信协议
- 实时数据推送

### 6. WebSocket
- 实时数据推送
- 设备状态更新
- 用户通知

## 🧪 测试和调试

### 运行测试
```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# 数据库测试
node scripts/test/test-db.js
```

### 调试工具
```bash
# 简单启动（最小配置）
node scripts/debug/start-simple.js

# 完整启动（所有功能）
node scripts/debug/start-full.js

# 数据库测试服务器
npm run debug:db

# 调试服务器
npm run debug:server
```

### 演示数据
```bash
# 创建演示用户
node scripts/demo/create-demo-users.js
```

## 📋 API文档

### 主要端点
- `GET /health` - 健康检查
- `POST /api/auth/login` - 用户登录
- `GET /api/devices` - 设备列表
- `POST /api/devices` - 创建设备
- `GET /api/data` - 数据查询
- `WebSocket /ws` - 实时数据

### 认证
所有API端点（除健康检查外）都需要JWT认证：
```bash
Authorization: Bearer <jwt_token>
```

## 🔍 故障排查

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查数据库配置
   node scripts/test/test-db.js
   ```

2. **MQTT连接失败**
   ```bash
   # 检查MQTT配置
   curl http://localhost:8000/health
   ```

3. **端口占用**
   ```bash
   # 检查端口使用
   netstat -tuln | grep 8000
   ```

### 日志查看
```bash
# 使用项目级日志
tail -f ../logs/backend/container.log

# 使用CLI工具
../scripts/iot-cli.sh logs tail backend
```

## 🛠️ 开发指南

### 代码结构
- **Controllers**: 处理HTTP请求
- **Services**: 业务逻辑
- **Models**: 数据模型
- **Middleware**: 请求中间件
- **Utils**: 工具函数

### 添加新功能
1. 在 `src/types/` 中定义类型
2. 在 `src/models/` 中定义数据模型
3. 在 `src/services/` 中实现业务逻辑
4. 在 `src/controllers/` 中处理请求
5. 在 `src/routes/` 中定义路由

### 数据库操作
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 查询数据
const devices = await prisma.device.findMany();

// 创建数据
const device = await prisma.device.create({
  data: { name: 'Device 1', type: 'sensor' }
});
```

## 📈 性能优化

### 数据库优化
- 使用索引
- 查询优化
- 连接池配置

### 缓存策略
- Redis缓存
- 内存缓存
- 查询结果缓存

### 监控指标
- 响应时间
- 内存使用
- CPU使用
- 数据库连接数

---

**注意**: 本服务使用TypeScript开发，确保在修改代码后重新编译。
