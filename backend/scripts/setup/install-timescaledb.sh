#!/bin/bash
# TimescaleDB 扩展安装脚本

set -e

echo "🚀 开始安装 TimescaleDB 扩展..."
echo ""

# 数据库连接信息
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-iot_platform}"
DB_USER="${DB_USER:-iot_user}"
DB_PASSWORD="${DB_PASSWORD:-iot_password}"

export PGPASSWORD="$DB_PASSWORD"

echo "📝 数据库连接信息:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# 1. 安装 TimescaleDB 扩展到容器
echo "📦 在 PostgreSQL 容器中安装 TimescaleDB..."

docker exec -it iot-postgres sh -c "
  apk add --no-cache --virtual .build-deps \
    gcc \
    make \
    cmake \
    git \
    clang \
    llvm \
    wget \
    openssl-dev \
    postgresql-dev && \
  cd /tmp && \
  wget https://github.com/timescale/timescaledb/archive/refs/tags/2.13.0.tar.gz && \
  tar -xzf 2.13.0.tar.gz && \
  cd timescaledb-2.13.0 && \
  ./bootstrap && \
  cd build && make && make install && \
  cd /tmp && rm -rf timescaledb-2.13.0* && \
  apk del .build-deps
"

echo "✅ TimescaleDB 扩展已安装到容器"
echo ""

# 2. 重启 PostgreSQL 容器以加载扩展
echo "🔄 重启 PostgreSQL 容器..."
docker restart iot-postgres
sleep 5

echo "✅ PostgreSQL 容器已重启"
echo ""

# 3. 在数据库中启用 TimescaleDB 扩展
echo "🔌 在数据库中启用 TimescaleDB 扩展..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- 启用 TimescaleDB 扩展
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 验证安装
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';

-- 显示 TimescaleDB 版本
SELECT default_version, installed_version 
FROM pg_available_extensions 
WHERE name = 'timescaledb';
EOF

echo "✅ TimescaleDB 扩展已启用"
echo ""

# 4. 将时序表转换为 Hypertable
echo "🔧 转换时序表为 Hypertable..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- 转换 telemetry 表为 Hypertable
SELECT create_hypertable(
  'telemetry', 
  'timestamp',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

-- 转换 device_status_history 表为 Hypertable
SELECT create_hypertable(
  'device_status_history',
  'timestamp',
  chunk_time_interval => INTERVAL '30 days',
  if_not_exists => TRUE
);

-- 显示已创建的 Hypertables
SELECT hypertable_name, num_dimensions 
FROM timescaledb_information.hypertables;
EOF

echo "✅ Hypertables 已创建"
echo ""

# 5. 配置压缩策略
echo "📦 配置数据压缩策略..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Telemetry 表压缩配置
ALTER TABLE telemetry SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id,device_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

-- 添加压缩策略：7天后压缩
SELECT add_compression_policy('telemetry', INTERVAL '7 days');

-- DeviceStatusHistory 表压缩配置
ALTER TABLE device_status_history SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id,device_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

-- 添加压缩策略：30天后压缩
SELECT add_compression_policy('device_status_history', INTERVAL '30 days');

-- 显示压缩策略
SELECT * FROM timescaledb_information.jobs 
WHERE proc_name = 'policy_compression';
EOF

echo "✅ 压缩策略已配置"
echo ""

# 6. 配置数据保留策略
echo "🗑️  配置数据保留策略..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Telemetry 保留策略：3年
SELECT add_retention_policy('telemetry', INTERVAL '3 years');

-- DeviceStatusHistory 保留策略：1年
SELECT add_retention_policy('device_status_history', INTERVAL '1 year');

-- 显示保留策略
SELECT * FROM timescaledb_information.jobs 
WHERE proc_name = 'policy_retention';
EOF

echo "✅ 保留策略已配置"
echo ""

# 7. 创建连续聚合视图
echo "📊 创建连续聚合视图..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- 5分钟聚合视图
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_5min
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('5 minutes', timestamp) AS bucket,
  tenant_id,
  device_id,
  COUNT(*) AS sample_count
FROM telemetry
GROUP BY bucket, tenant_id, device_id
WITH NO DATA;

-- 添加刷新策略
SELECT add_continuous_aggregate_policy('telemetry_5min',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes');

-- 1小时聚合视图
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1hour
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', timestamp) AS bucket,
  tenant_id,
  device_id,
  COUNT(*) AS sample_count
FROM telemetry
GROUP BY bucket, tenant_id, device_id
WITH NO DATA;

-- 添加刷新策略
SELECT add_continuous_aggregate_policy('telemetry_1hour',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- 显示连续聚合
SELECT * FROM timescaledb_information.continuous_aggregates;
EOF

echo "✅ 连续聚合视图已创建"
echo ""

# 8. 优化性能
echo "⚡ 优化数据库性能..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- 更新统计信息
ANALYZE telemetry;
ANALYZE device_status_history;

-- 显示 chunks 信息
SELECT 
  hypertable_name,
  COUNT(*) as num_chunks,
  pg_size_pretty(SUM(total_bytes)) as total_size
FROM timescaledb_information.chunks
GROUP BY hypertable_name;
EOF

echo "✅ 性能优化完成"
echo ""

# 9. 验证安装
echo "🔍 验证 TimescaleDB 配置..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- 显示所有 Hypertables
\echo '📊 Hypertables:'
SELECT * FROM timescaledb_information.hypertables;

\echo ''
\echo '📦 压缩策略:'
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_compression';

\echo ''
\echo '🗑️  保留策略:'
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';

\echo ''
\echo '📈 连续聚合:'
SELECT view_name, materialization_hypertable_name 
FROM timescaledb_information.continuous_aggregates;
EOF

echo ""
echo "✨ TimescaleDB 安装和配置完成！"
echo ""
echo "📝 摘要:"
echo "   ✅ TimescaleDB 扩展已启用"
echo "   ✅ Hypertables 已创建 (telemetry, device_status_history)"
echo "   ✅ 压缩策略已配置 (7天/30天后自动压缩)"
echo "   ✅ 保留策略已配置 (3年/1年自动清理)"
echo "   ✅ 连续聚合视图已创建 (5分钟/1小时)"
echo ""
echo "🎯 下一步:"
echo "   1. 更新 Prisma schema 以启用 TimescaleDB 扩展"
echo "   2. 重启后端服务"
echo ""

