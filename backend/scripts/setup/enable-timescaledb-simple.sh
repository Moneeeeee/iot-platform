#!/bin/bash
# TimescaleDB 快速启用脚本（使用官方镜像）

set -e

echo "🚀 启用 TimescaleDB（使用官方镜像）..."
echo ""

# 1. 停止当前 postgres
echo "⏹️  停止当前 PostgreSQL 容器..."
cd /opt/iot-platform
docker-compose stop postgres
docker-compose rm -f postgres

echo "✅ 旧容器已停止"
echo ""

# 2. 使用 TimescaleDB 镜像启动
echo "🐘 使用 TimescaleDB 镜像启动 PostgreSQL..."
docker-compose -f docker-compose.yml -f docker-compose.timescaledb.yml up -d postgres

echo "✅ TimescaleDB 容器已启动"
echo ""

# 3. 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 10

# 4. 启用扩展并配置
echo "🔧 配置 TimescaleDB..."

export PGPASSWORD="iot_password"

psql -h localhost -p 5432 -U iot_user -d iot_platform << 'EOF'
-- 启用 TimescaleDB 扩展
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 验证
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';

-- 转换为 Hypertable
SELECT create_hypertable(
  'telemetry', 
  'timestamp',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

SELECT create_hypertable(
  'device_status_history',
  'timestamp',
  chunk_time_interval => INTERVAL '30 days',
  if_not_exists => TRUE
);

-- 配置压缩
ALTER TABLE telemetry SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id,device_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('telemetry', INTERVAL '7 days');

ALTER TABLE device_status_history SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id,device_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('device_status_history', INTERVAL '30 days');

-- 配置保留策略
SELECT add_retention_policy('telemetry', INTERVAL '3 years');
SELECT add_retention_policy('device_status_history', INTERVAL '1 year');

-- 显示结果
\echo ''
\echo '✅ TimescaleDB 配置完成！'
\echo ''
\echo '📊 Hypertables:'
SELECT hypertable_name FROM timescaledb_information.hypertables;

\echo ''
\echo '📦 后台任务:'
SELECT job_id, proc_name, scheduled FROM timescaledb_information.jobs;
EOF

echo ""
echo "✨ TimescaleDB 已成功启用！"
echo ""
echo "📝 要使更改永久生效，请在 docker-compose.yml 中将 postgres 镜像改为:"
echo "   image: timescale/timescaledb:latest-pg15"
echo ""

