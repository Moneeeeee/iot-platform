-- ==========================================
-- TimescaleDB 扩展初始化脚本
-- 用于时序数据优化（Telemetry、DeviceStatusHistory）
-- ==========================================

-- 1. 启用 TimescaleDB 扩展
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. 验证扩展版本
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';

-- ==========================================
-- 3. 转换表为 Hypertable（时序优化）
-- ==========================================

-- 3.1 Telemetry 表转为 Hypertable
-- 分区键: timestamp, 7天一个chunk
SELECT create_hypertable(
  'telemetry', 
  'timestamp',
  chunk_time_interval => INTERVAL '7 days',
  if_not_exists => TRUE
);

-- 3.2 DeviceStatusHistory 表转为 Hypertable
SELECT create_hypertable(
  'device_status_history',
  'timestamp',
  chunk_time_interval => INTERVAL '30 days',
  if_not_exists => TRUE
);

-- ==========================================
-- 4. 创建复合索引（多租户优化）
-- ==========================================

-- Telemetry 多租户查询优化
CREATE INDEX IF NOT EXISTS idx_telemetry_tenant_device_time
  ON telemetry (tenant_id, device_id, timestamp DESC);

-- DeviceStatusHistory 多租户查询优化
CREATE INDEX IF NOT EXISTS idx_device_status_tenant_device_time
  ON device_status_history (tenant_id, device_id, timestamp DESC);

-- ==========================================
-- 5. 数据压缩策略（冷数据压缩）
-- ==========================================

-- 5.1 Telemetry 压缩：7天后压缩
ALTER TABLE telemetry SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id,device_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('telemetry', INTERVAL '7 days');

-- 5.2 DeviceStatusHistory 压缩：30天后压缩
ALTER TABLE device_status_history SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id,device_id',
  timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('device_status_history', INTERVAL '30 days');

-- ==========================================
-- 6. 数据保留策略（自动清理）
-- ==========================================

-- 6.1 Telemetry 默认保留3年（可按租户覆盖）
SELECT add_retention_policy('telemetry', INTERVAL '3 years');

-- 6.2 DeviceStatusHistory 默认保留1年
SELECT add_retention_policy('device_status_history', INTERVAL '1 year');

-- ==========================================
-- 7. 连续聚合（Continuous Aggregates）
-- ==========================================

-- 7.1 Telemetry 5分钟聚合（温数据）
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_5min
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('5 minutes', timestamp) AS bucket,
  tenant_id,
  device_id,
  jsonb_object_agg(key, avg_value) AS metrics_avg,
  jsonb_object_agg(key, min_value) AS metrics_min,
  jsonb_object_agg(key, max_value) AS metrics_max,
  COUNT(*) AS sample_count
FROM (
  SELECT
    timestamp,
    tenant_id,
    device_id,
    jsonb_each.key,
    (jsonb_each.value::text::numeric) AS avg_value,
    (jsonb_each.value::text::numeric) AS min_value,
    (jsonb_each.value::text::numeric) AS max_value
  FROM telemetry,
  LATERAL jsonb_each(metrics)
  WHERE jsonb_typeof(jsonb_each.value) = 'number'
) sub
GROUP BY bucket, tenant_id, device_id
WITH NO DATA;

-- 刷新策略：每5分钟刷新一次
SELECT add_continuous_aggregate_policy('telemetry_5min',
  start_offset => INTERVAL '1 hour',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes');

-- 7.2 Telemetry 1小时聚合（冷数据）
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1hour
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', timestamp) AS bucket,
  tenant_id,
  device_id,
  jsonb_object_agg(key, avg_value) AS metrics_avg,
  jsonb_object_agg(key, min_value) AS metrics_min,
  jsonb_object_agg(key, max_value) AS metrics_max,
  COUNT(*) AS sample_count
FROM (
  SELECT
    timestamp,
    tenant_id,
    device_id,
    jsonb_each.key,
    (jsonb_each.value::text::numeric) AS avg_value,
    (jsonb_each.value::text::numeric) AS min_value,
    (jsonb_each.value::text::numeric) AS max_value
  FROM telemetry,
  LATERAL jsonb_each(metrics)
  WHERE jsonb_typeof(jsonb_each.value) = 'number'
) sub
GROUP BY bucket, tenant_id, device_id
WITH NO DATA;

-- 刷新策略：每小时刷新一次
SELECT add_continuous_aggregate_policy('telemetry_1hour',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- ==========================================
-- 8. 性能优化：统计信息收集
-- ==========================================

ANALYZE telemetry;
ANALYZE device_status_history;

-- ==========================================
-- 9. 验证配置
-- ==========================================

-- 查看 Hypertables
SELECT * FROM timescaledb_information.hypertables;

-- 查看压缩策略
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_compression';

-- 查看保留策略
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';

-- 查看连续聚合
SELECT * FROM timescaledb_information.continuous_aggregates;

-- 查看 chunks 分布
SELECT * FROM timescaledb_information.chunks
WHERE hypertable_name IN ('telemetry', 'device_status_history')
ORDER BY range_start DESC
LIMIT 10;

-- ==========================================
-- 完成！
-- ==========================================

