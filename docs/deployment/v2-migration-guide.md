# IoT 平台 V2 渐进式迁移指南

## 📋 概述

本指南描述如何从 V1 单租户架构平滑迁移到 V2 多租户模块化架构，实现零停机迁移。

## 🎯 迁移策略

### 策略选择：双写模式（Zero Downtime）

1. **Phase 1**: 准备阶段 - 创建 V2 数据结构
2. **Phase 2**: 双写阶段 - 新旧数据库同时写入
3. **Phase 3**: 验证阶段 - 数据一致性检查
4. **Phase 4**: 切换阶段 - 流量逐步切换到 V2
5. **Phase 5**: 清理阶段 - 移除旧数据结构

## 📅 迁移步骤

### Phase 1: 准备阶段（预计 2-4 小时）

#### 1.1 备份现有数据库

```bash
# 创建完整备份
pg_dump -h localhost -U postgres -d iot_platform -F c -f backup_v1_$(date +%Y%m%d_%H%M%S).dump

# 验证备份
pg_restore --list backup_v1_*.dump | head -20
```

#### 1.2 部署 V2 Schema

```bash
# 1. 使用新的 schema 文件
cd /opt/iot-platform/backend
cp prisma/schema-v2.prisma prisma/schema.prisma

# 2. 生成 Prisma Client
npm run prisma:generate

# 3. 创建迁移（但不应用）
npm run prisma:migrate dev --create-only --name v2-multitenant

# 4. 检查生成的 SQL
cat prisma/migrations/*/migration.sql
```

#### 1.3 配置 TimescaleDB（可选）

```bash
# 如果使用 TimescaleDB
docker-compose down db
docker-compose up -d db

# 等待数据库启动
sleep 10

# 执行 TimescaleDB 初始化
psql -h localhost -U postgres -d iot_platform -f backend/prisma/migrations/v2-timescaledb-setup.sql

# 或者使用降级方案
psql -h localhost -U postgres -d iot_platform -f backend/scripts/migrations/fallback-to-native-partitioning.sql
```

#### 1.4 创建默认租户

```sql
-- 连接到数据库
psql -h localhost -U postgres -d iot_platform

-- 创建默认租户（将旧数据迁移到此租户）
INSERT INTO tenants (id, name, slug, plan, status, created_at, updated_at)
VALUES (
  'default_tenant_id',
  'Default Tenant',
  'default',
  'ENTERPRISE',
  'ACTIVE',
  NOW(),
  NOW()
);
```

### Phase 2: 双写阶段（持续 1-3 天）

#### 2.1 启用双写中间件

创建双写中间件文件：

```typescript
// backend/src/middleware/dual-write.ts
import { prisma as prismaV1 } from '@/config/database-v1';
import { prisma as prismaV2 } from '@/config/database';

export class DualWriteMiddleware {
  static async writeDevice(data: any) {
    // 写入 V1
    const v1Result = await prismaV1.device.create({ data });
    
    // 写入 V2（添加 tenant_id）
    const v2Data = { ...data, tenantId: 'default_tenant_id' };
    const v2Result = await prismaV2.device.create({ data: v2Data });
    
    return v1Result; // 继续使用 V1 结果
  }
  
  // 类似的方法用于 update、delete 等
}
```

#### 2.2 修改应用代码启用双写

```typescript
// 示例：设备创建
// 旧代码
// const device = await prisma.device.create({ data });

// 新代码（双写）
const device = await DualWriteMiddleware.writeDevice(data);
```

#### 2.3 迁移历史数据

```bash
# 运行数据迁移脚本
node backend/scripts/migrations/migrate-v1-to-v2.js

# 脚本内容见下方
```

**迁移脚本示例 (migrate-v1-to-v2.js)**:

```javascript
const { PrismaClient: PrismaV1 } = require('@prisma/client');
const { PrismaClient: PrismaV2 } = require('@prisma/client-v2');

const prismaV1 = new PrismaV1();
const prismaV2 = new PrismaV2();

const DEFAULT_TENANT_ID = 'default_tenant_id';

async function migrateUsers() {
  console.log('Migrating users...');
  
  const users = await prismaV1.user.findMany();
  
  for (const user of users) {
    await prismaV2.user.upsert({
      where: { id: user.id },
      create: {
        ...user,
        tenantId: DEFAULT_TENANT_ID,
      },
      update: {},
    });
  }
  
  console.log(`Migrated ${users.length} users`);
}

async function migrateDevices() {
  console.log('Migrating devices...');
  
  const devices = await prismaV1.device.findMany();
  
  for (const device of devices) {
    // 找到或创建默认模板
    const template = await getOrCreateDefaultTemplate(device.type);
    
    await prismaV2.device.upsert({
      where: { id: device.id },
      create: {
        ...device,
        tenantId: DEFAULT_TENANT_ID,
        templateId: template.id,
        attributes: device.config || {},
        metadata: {
          migratedFrom: 'v1',
          originalType: device.type,
        },
      },
      update: {},
    });
  }
  
  console.log(`Migrated ${devices.length} devices`);
}

async function migrateTelemetry() {
  console.log('Migrating telemetry data...');
  
  // 批量迁移，每次1000条
  let skip = 0;
  const batchSize = 1000;
  
  while (true) {
    const telemetry = await prismaV1.deviceData.findMany({
      skip,
      take: batchSize,
      orderBy: { timestamp: 'asc' },
    });
    
    if (telemetry.length === 0) break;
    
    const v2Data = telemetry.map(t => ({
      tenantId: DEFAULT_TENANT_ID,
      deviceId: t.deviceId,
      timestamp: t.timestamp,
      metrics: t.data,
      protocol: t.protocol,
      source: t.source || 'migrated',
      quality: 'GOOD',
    }));
    
    await prismaV2.telemetry.createMany({ data: v2Data });
    
    skip += batchSize;
    console.log(`Migrated ${skip} telemetry records`);
  }
}

async function main() {
  try {
    await migrateUsers();
    await migrateDevices();
    await migrateTelemetry();
    // ... 其他数据表
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prismaV1.$disconnect();
    await prismaV2.$disconnect();
  }
}

main();
```

### Phase 3: 验证阶段（持续 2-3 天）

#### 3.1 数据一致性检查

```bash
# 运行验证脚本
node backend/scripts/migrations/verify-migration.js
```

```javascript
// verify-migration.js
async function verifyDataConsistency() {
  // 检查用户数量
  const v1UserCount = await prismaV1.user.count();
  const v2UserCount = await prismaV2.user.count({ where: { tenantId: DEFAULT_TENANT_ID } });
  console.log(`Users: V1=${v1UserCount}, V2=${v2UserCount}`);
  
  // 检查设备数量
  const v1DeviceCount = await prismaV1.device.count();
  const v2DeviceCount = await prismaV2.device.count({ where: { tenantId: DEFAULT_TENANT_ID } });
  console.log(`Devices: V1=${v1DeviceCount}, V2=${v2DeviceCount}`);
  
  // 检查遥测数据量
  const v1TelemetryCount = await prismaV1.deviceData.count();
  const v2TelemetryCount = await prismaV2.telemetry.count({ where: { tenantId: DEFAULT_TENANT_ID } });
  console.log(`Telemetry: V1=${v1TelemetryCount}, V2=${v2TelemetryCount}`);
  
  // 随机抽样验证
  const sampleDevices = await prismaV1.device.findMany({ take: 10 });
  for (const device of sampleDevices) {
    const v2Device = await prismaV2.device.findUnique({ where: { id: device.id } });
    if (!v2Device) {
      console.error(`❌ Device ${device.id} missing in V2`);
    }
  }
}
```

#### 3.2 性能测试

```bash
# 对比 V1 和 V2 API 性能
npm run test:performance
```

### Phase 4: 切换阶段（2-4 小时）

#### 4.1 灰度切换流量

```typescript
// 使用百分比逐步切换
const USE_V2_PERCENTAGE = process.env.V2_TRAFFIC_PERCENTAGE || 10;

function shouldUseV2() {
  return Math.random() * 100 < USE_V2_PERCENTAGE;
}

// 在读取操作中使用
async function getDevice(id: string) {
  if (shouldUseV2()) {
    return await prismaV2.device.findUnique({ 
      where: { id, tenantId: getTenantId() } 
    });
  } else {
    return await prismaV1.device.findUnique({ where: { id } });
  }
}
```

#### 4.2 逐步提升流量

```bash
# Day 1: 10% 流量
export V2_TRAFFIC_PERCENTAGE=10
docker-compose restart backend

# Day 2: 25% 流量
export V2_TRAFFIC_PERCENTAGE=25
docker-compose restart backend

# Day 3: 50% 流量
export V2_TRAFFIC_PERCENTAGE=50
docker-compose restart backend

# Day 4: 100% 流量
export V2_TRAFFIC_PERCENTAGE=100
docker-compose restart backend
```

#### 4.3 监控告警

```bash
# 监控关键指标
- API 响应时间
- 错误率
- 数据库查询性能
- 消息总线吞吐量

# 如果发现问题，立即回滚
export V2_TRAFFIC_PERCENTAGE=0
docker-compose restart backend
```

### Phase 5: 清理阶段（1-2 天）

#### 5.1 停止双写

```typescript
// 移除双写中间件，直接使用 V2
const device = await prisma.device.create({ 
  data: { ...data, tenantId: req.tenant.id } 
});
```

#### 5.2 归档 V1 数据

```bash
# 导出 V1 数据作为归档
pg_dump -h localhost -U postgres -d iot_platform \
  -t users -t devices -t device_data -t alerts \
  -F c -f archive_v1_$(date +%Y%m%d).dump

# 压缩归档
gzip archive_v1_*.dump
```

#### 5.3 删除 V1 表（谨慎操作）

```sql
-- ⚠️ 确认 V2 运行稳定后再执行
-- 建议保留 V1 表 1-2 周作为保险

-- 重命名 V1 表（而不是删除）
ALTER TABLE users RENAME TO users_v1_archived;
ALTER TABLE devices RENAME TO devices_v1_archived;
ALTER TABLE device_data RENAME TO device_data_v1_archived;

-- 1-2 周后确认无误，再删除
-- DROP TABLE users_v1_archived CASCADE;
```

## ⚠️ 回滚方案

### 紧急回滚步骤

```bash
# 1. 停止应用
docker-compose stop backend

# 2. 切换回 V1 配置
export USE_V2_SCHEMA=false

# 3. 恢复 V1 Prisma Schema
cp prisma/schema-v1.prisma prisma/schema.prisma
npm run prisma:generate

# 4. 重启应用
docker-compose start backend

# 5. 验证
curl http://localhost:3000/health
```

## 📊 迁移检查清单

- [ ] 数据库备份已创建
- [ ] V2 Schema 已部署
- [ ] TimescaleDB 扩展已配置
- [ ] 默认租户已创建
- [ ] 双写中间件已实现
- [ ] 历史数据已迁移
- [ ] 数据一致性验证通过
- [ ] 性能测试通过
- [ ] 灰度流量切换计划制定
- [ ] 监控告警已配置
- [ ] 回滚方案已演练

## 📝 注意事项

1. **不要跳过阶段**：严格按照 Phase 1-5 执行
2. **充分测试**：在生产环境迁移前，在测试环境完整演练
3. **监控优先**：每个阶段都要密切监控系统指标
4. **保留回滚选项**：至少保留 2 周的回滚窗口
5. **文档记录**：记录每一步操作和遇到的问题

## 🆘 故障排查

### 常见问题

**Q: 迁移后 API 性能下降**
- 检查是否正确配置了索引
- 验证 TimescaleDB 压缩是否生效
- 检查租户过滤是否正确应用

**Q: 数据不一致**
- 运行 verify-migration.js 定位差异
- 检查双写逻辑是否正确
- 手动修复缺失数据

**Q: 消息总线故障**
- 检查 Redis 连接
- 切换到 EventEmitter 模式
- 查看消息总线日志

## 📞 支持

如有问题，请联系：
- 技术支持：support@iot-platform.com
- 文档：https://docs.iot-platform.com/migration-v2

