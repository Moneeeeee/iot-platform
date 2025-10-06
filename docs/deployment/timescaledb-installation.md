# TimescaleDB 安装指南

## 📋 概述

TimescaleDB 是专为时序数据优化的 PostgreSQL 扩展，可显著提升遥测数据的存储和查询性能。

## 🎯 优势

- **自动分区**: 按时间自动分区数据（chunks）
- **数据压缩**: 自动压缩历史数据，节省 90%+ 存储空间
- **连续聚合**: 预计算聚合数据，加速查询
- **数据保留**: 自动清理过期数据
- **原生 SQL**: 完全兼容 PostgreSQL，无需修改查询

## 🚀 方案一：使用官方镜像（推荐）

### 步骤 1：修改 docker-compose.yml

将 postgres 服务的镜像改为 TimescaleDB 官方镜像：

```yaml
services:
  postgres:
    # image: postgres:15-alpine  # 旧镜像
    image: timescale/timescaledb:latest-pg15  # 新镜像
    container_name: iot-postgres
    # ... 其他配置保持不变
```

### 步骤 2：重启服务

```bash
cd /opt/iot-platform
docker-compose down
docker-compose up -d postgres
```

### 步骤 3：启用扩展

```bash
# 运行配置脚本
bash backend/scripts/setup/enable-timescaledb-simple.sh
```

### 步骤 4：更新 Prisma Schema

在 `backend/prisma/schema.prisma` 中启用 TimescaleDB：

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [timescaledb(schema: "public")]
}
```

## 🛠️ 方案二：手动安装

### 使用快速脚本

```bash
cd /opt/iot-platform
bash backend/scripts/setup/install-timescaledb.sh
```

## 📊 验证安装

```sql
-- 连接到数据库
psql -h localhost -p 5432 -U iot_user -d iot_platform

-- 检查扩展
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';

-- 查看 Hypertables
SELECT * FROM timescaledb_information.hypertables;

-- 查看后台任务
SELECT job_id, proc_name, scheduled, next_start 
FROM timescaledb_information.jobs;

-- 查看 chunks
SELECT hypertable_name, COUNT(*) as num_chunks 
FROM timescaledb_information.chunks 
GROUP BY hypertable_name;
```

## 📈 性能对比

| 指标 | 标准 PostgreSQL | TimescaleDB |
|------|----------------|-------------|
| 写入性能 | 1x | 1.2x |
| 查询性能 | 1x | 5-10x |
| 存储占用 | 100% | 10-20% (压缩后) |
| 分区管理 | 手动 | 自动 |
| 数据清理 | 手动 | 自动 |

## 🔧 配置说明

### Hypertable 配置

```sql
-- Telemetry 表
-- - 分区间隔: 7 天
-- - 压缩策略: 7 天后压缩
-- - 保留期限: 3 年

-- DeviceStatusHistory 表
-- - 分区间隔: 30 天
-- - 压缩策略: 30 天后压缩
-- - 保留期限: 1 年
```

### 连续聚合

- **5分钟聚合**: 用于近期数据可视化
- **1小时聚合**: 用于长期趋势分析

## ⚙️ 调优建议

### 1. 调整 chunk 大小

```sql
-- 根据数据量调整
SELECT set_chunk_time_interval('telemetry', INTERVAL '1 day');  -- 小数据量
SELECT set_chunk_time_interval('telemetry', INTERVAL '7 days'); -- 中等数据量
SELECT set_chunk_time_interval('telemetry', INTERVAL '30 days'); -- 大数据量
```

### 2. 自定义压缩策略

```sql
-- 调整压缩时间
SELECT remove_compression_policy('telemetry');
SELECT add_compression_policy('telemetry', INTERVAL '3 days');
```

### 3. 自定义保留策略

```sql
-- 调整保留期
SELECT remove_retention_policy('telemetry');
SELECT add_retention_policy('telemetry', INTERVAL '5 years');
```

## 🔍 监控

### 查看压缩率

```sql
SELECT 
  hypertable_name,
  total_bytes,
  pg_size_pretty(total_bytes) as total_size,
  pg_size_pretty(compressed_total_bytes) as compressed_size,
  ROUND(100.0 * compressed_total_bytes / total_bytes, 2) as compression_ratio
FROM timescaledb_information.hypertables
WHERE total_bytes > 0;
```

### 查看后台任务状态

```sql
SELECT 
  job_id,
  proc_name,
  scheduled,
  next_start,
  total_runs,
  total_successes,
  total_failures
FROM timescaledb_information.jobs;
```

## 🚨 故障排查

### 问题：扩展未找到

```bash
# 检查容器镜像
docker inspect iot-postgres | grep Image

# 应该显示: timescale/timescaledb
```

### 问题：Hypertable 创建失败

```sql
-- 检查表是否已存在数据
SELECT COUNT(*) FROM telemetry;

-- 如果有数据，需要先清空或迁移
```

### 问题：压缩策略不生效

```sql
-- 手动触发压缩
CALL run_job(<job_id>);

-- 查看压缩任务日志
SELECT * FROM timescaledb_information.job_stats 
WHERE job_id = <job_id>;
```

## 📚 参考资料

- [TimescaleDB 官方文档](https://docs.timescale.com/)
- [最佳实践](https://docs.timescale.com/timescaledb/latest/how-to-guides/hypertables/)
- [性能调优](https://docs.timescale.com/timescaledb/latest/how-to-guides/performance/)

## 🎓 下一步

安装完成后，您可以：

1. 在 Prisma schema 中启用 TimescaleDB 扩展
2. 创建连续聚合视图用于实时仪表板
3. 配置自定义保留策略满足业务需求
4. 监控压缩率和查询性能

---

**注意**: TimescaleDB 完全兼容 PostgreSQL，即使不启用也不影响系统运行，只是性能和存储效率会降低。

