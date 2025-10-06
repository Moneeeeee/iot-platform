# 数据库模式文档

## 📊 概述

本文档描述了IoT平台的数据库模式设计，基于Prisma ORM构建。

## 🏗️ 数据模型架构

### 核心实体关系

```
User (用户)
├── Device[] (设备)
│   ├── DeviceData[] (设备数据)
│   ├── Alert[] (告警)
│   └── Log[] (日志)
├── Alert[] (告警)
├── Log[] (日志)
├── UserSession[] (用户会话)
└── FileUpload[] (文件上传)

SystemConfig (系统配置)
SystemStats (系统统计)
DeviceTemplate (设备模板)
```

## 📋 数据表详细说明

### 1. 用户管理

#### User (用户表)
```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique @db.VarChar(50)
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  role         UserRole @default(VIEWER)
  permissions  String[] @default([])
  language     Language @default(ZH_CN)
  isActive     Boolean  @default(true)
  isDeleted    Boolean  @default(false)
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?
}
```

**字段说明**:
- `id`: 用户唯一标识
- `username`: 用户名 (最大50字符)
- `email`: 邮箱地址 (最大255字符)
- `passwordHash`: 密码哈希
- `role`: 用户角色 (ADMIN/OPERATOR/VIEWER)
- `permissions`: 权限列表
- `language`: 语言偏好
- `isActive`: 是否激活
- `isDeleted`: 软删除标记
- `lastLoginAt`: 最后登录时间

**索引**:
- `username` (唯一)
- `email` (唯一)
- `isActive`
- `isDeleted`
- `lastLoginAt`

#### UserSession (用户会话表)
```prisma
model UserSession {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. 设备管理

#### Device (设备表)
```prisma
model Device {
  id          String       @id @default(cuid())
  slug        String       @unique @db.VarChar(100)
  name        String       @db.VarChar(255)
  type        DeviceType
  status      DeviceStatus @default(OFFLINE)
  config      Json         @default("{}")
  capabilities String[]    @default([])
  lastSeenAt  DateTime?
  isDeleted   Boolean      @default(false)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?
}
```

**设备类型**:
- `SMART_SENSOR`: 智能传感器
- `SMART_GATEWAY`: 智能网关
- `SMART_CONTROLLER`: 智能控制器
- `POWERSAFE`: PowerSafe设备

**设备状态**:
- `ONLINE`: 在线
- `OFFLINE`: 离线
- `ERROR`: 错误
- `MAINTENANCE`: 维护中

#### DeviceData (设备数据表)
```prisma
model DeviceData {
  id        String   @id @default(cuid())
  deviceId  String
  data      Json
  timestamp DateTime @default(now())
  protocol  ProtocolType
  source    String
}
```

**协议类型**:
- `MQTT`: MQTT协议
- `TCP`: TCP协议
- `UDP`: UDP协议
- `HTTP`: HTTP协议
- `HTTPS`: HTTPS协议
- `WEBSOCKET`: WebSocket协议

### 3. 告警管理

#### Alert (告警表)
```prisma
model Alert {
  id             String      @id @default(cuid())
  deviceId       String
  level          AlertLevel
  status         AlertStatus @default(ACTIVE)
  title          String
  message        String
  data           Json        @default("{}")
  triggeredAt    DateTime    @default(now())
  resolvedAt     DateTime?
  acknowledgedBy String?
  acknowledgedAt DateTime?
}
```

**告警级别**:
- `INFO`: 信息
- `WARNING`: 警告
- `ERROR`: 错误
- `CRITICAL`: 严重

**告警状态**:
- `ACTIVE`: 活跃
- `RESOLVED`: 已解决
- `SUPPRESSED`: 已抑制

### 4. 系统管理

#### SystemConfig (系统配置表)
```prisma
model SystemConfig {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### SystemStats (系统统计表)
```prisma
model SystemStats {
  id            String   @id @default(cuid())
  date          DateTime @db.Date
  totalUsers    Int      @default(0)
  totalDevices  Int      @default(0)
  onlineDevices Int      @default(0)
  totalAlerts   Int      @default(0)
  activeAlerts  Int      @default(0)
  createdAt     DateTime @default(now())
}
```

### 5. 日志管理

#### Log (日志表)
```prisma
model Log {
  id        String   @id @default(cuid())
  level     LogLevel
  message   String
  data      Json?
  userId    String?
  deviceId  String?
  timestamp DateTime @default(now())
}
```

**日志级别**:
- `ERROR`: 错误
- `WARN`: 警告
- `INFO`: 信息
- `DEBUG`: 调试

### 6. 文件管理

#### FileUpload (文件上传表)
```prisma
model FileUpload {
  id          String   @id @default(cuid())
  filename    String
  originalName String
  mimeType    String
  size        Int
  path        String
  uploadedBy  String
  createdAt   DateTime @default(now())
}
```

### 7. 设备模板

#### DeviceTemplate (设备模板表)
```prisma
model DeviceTemplate {
  id          String     @id @default(cuid())
  name        String
  type        DeviceType
  description String?
  config      Json       @default("{}")
  capabilities String[]  @default([])
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}
```

## 🔧 数据库优化

### 索引策略

1. **主键索引**: 所有表都有主键索引
2. **唯一索引**: 用户名、邮箱、设备slug等
3. **查询索引**: 常用查询字段建立索引
4. **复合索引**: 多字段查询优化

### 性能优化

1. **软删除**: 使用`isDeleted`字段而非物理删除
2. **时间戳**: 自动管理创建和更新时间
3. **JSON字段**: 灵活存储配置和数据
4. **外键约束**: 保证数据完整性

## 🚀 使用示例

### 创建用户
```typescript
const user = await prisma.user.create({
  data: {
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: 'hashed_password',
    role: 'ADMIN'
  }
});
```

### 创建设备
```typescript
const device = await prisma.device.create({
  data: {
    slug: 'device-001',
    name: '温度传感器',
    type: 'SMART_SENSOR',
    userId: user.id,
    config: {
      temperature: { min: -40, max: 85 },
      humidity: { min: 0, max: 100 }
    }
  }
});
```

### 查询设备数据
```typescript
const deviceData = await prisma.deviceData.findMany({
  where: {
    deviceId: device.id,
    timestamp: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
    }
  },
  orderBy: { timestamp: 'desc' },
  take: 100
});
```

## 📈 数据迁移

### 生成迁移
```bash
npx prisma migrate dev --name add_soft_delete
```

### 应用迁移
```bash
npx prisma migrate deploy
```

### 重置数据库
```bash
npx prisma migrate reset
```

## 🔍 监控和维护

### 数据库健康检查
```typescript
const healthCheck = await prisma.$queryRaw`SELECT 1 as health`;
```

### 性能监控
- 查询执行时间
- 索引使用情况
- 连接池状态
- 慢查询日志

---

**注意**: 修改schema后需要运行 `npx prisma generate` 重新生成客户端代码。
