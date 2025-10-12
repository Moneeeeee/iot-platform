-- TimescaleDB 初始化脚本
-- Fountain IoT Platform - 时序数据库

-- 创建 TimescaleDB 扩展
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 创建遥测数据表
CREATE TABLE IF NOT EXISTS telemetry (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL,
    device_id UUID NOT NULL,
    metric VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION,
    unit VARCHAR(20),
    tags JSONB
);

-- 转换为 Hypertable（自动分区）
SELECT create_hypertable('telemetry', 'time', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_telemetry_tenant_time ON telemetry (tenant_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_metric_time ON telemetry (metric, time DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_tags ON telemetry USING GIN (tags);

-- 启用压缩
ALTER TABLE telemetry SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_id,metric',
    timescaledb.compress_orderby = 'time DESC'
);

-- 添加压缩策略（7天后压缩）
SELECT add_compression_policy('telemetry', INTERVAL '7 days');

-- 添加数据保留策略（1年后删除）
SELECT add_retention_policy('telemetry', INTERVAL '365 days');

-- 创建连续聚合视图（1分钟级别）
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', time) AS bucket,
    tenant_id,
    device_id,
    metric,
    AVG(value) AS avg_value,
    MAX(value) AS max_value,
    MIN(value) AS min_value,
    COUNT(*) AS count
FROM telemetry
GROUP BY bucket, tenant_id, device_id, metric;

-- 添加连续聚合刷新策略
SELECT add_continuous_aggregate_policy('telemetry_1min',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute'
);

-- 创建 1 小时聚合视图
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1hour
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    tenant_id,
    device_id,
    metric,
    AVG(value) AS avg_value,
    MAX(value) AS max_value,
    MIN(value) AS min_value,
    COUNT(*) AS count
FROM telemetry
GROUP BY bucket, tenant_id, device_id, metric;

-- 添加 1 小时聚合刷新策略
SELECT add_continuous_aggregate_policy('telemetry_1hour',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

-- 创建 1 天聚合视图
CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_1day
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    tenant_id,
    device_id,
    metric,
    AVG(value) AS avg_value,
    MAX(value) AS max_value,
    MIN(value) AS min_value,
    COUNT(*) AS count
FROM telemetry
GROUP BY bucket, tenant_id, device_id, metric;

-- 添加 1 天聚合刷新策略
SELECT add_continuous_aggregate_policy('telemetry_1day',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day'
);

-- 创建设备事件表
CREATE TABLE IF NOT EXISTS device_events (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL,
    device_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    severity VARCHAR(20)
);

-- 转换为 Hypertable
SELECT create_hypertable('device_events', 'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_events_tenant_time ON device_events (tenant_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_events_device_time ON device_events (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON device_events (event_type, time DESC);

-- 启用压缩
ALTER TABLE device_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_id,event_type',
    timescaledb.compress_orderby = 'time DESC'
);

-- 添加压缩策略（3天后压缩）
SELECT add_compression_policy('device_events', INTERVAL '3 days');

-- 添加数据保留策略（180天后删除）
SELECT add_retention_policy('device_events', INTERVAL '180 days');

-- 创建告警历史表
CREATE TABLE IF NOT EXISTS alarm_history (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL,
    device_id UUID,
    alarm_id UUID NOT NULL,
    level VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(20),
    data JSONB
);

-- 转换为 Hypertable
SELECT create_hypertable('alarm_history', 'time',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_alarms_tenant_time ON alarm_history (tenant_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_alarms_device_time ON alarm_history (device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_alarms_level_time ON alarm_history (level, time DESC);

-- 添加压缩策略（7天后压缩）
SELECT add_compression_policy('alarm_history', INTERVAL '7 days');

-- 添加数据保留策略（90天后删除）
SELECT add_retention_policy('alarm_history', INTERVAL '90 days');

-- 创建一些有用的函数

-- 获取设备最新数据
CREATE OR REPLACE FUNCTION get_device_latest_data(
    p_device_id UUID,
    p_metrics TEXT[]
)
RETURNS TABLE (
    metric VARCHAR(100),
    value DOUBLE PRECISION,
    unit VARCHAR(20),
    time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (t.metric)
        t.metric,
        t.value,
        t.unit,
        t.time
    FROM telemetry t
    WHERE t.device_id = p_device_id
      AND (p_metrics IS NULL OR t.metric = ANY(p_metrics))
    ORDER BY t.metric, t.time DESC;
END;
$$ LANGUAGE plpgsql;

-- 获取设备统计信息
CREATE OR REPLACE FUNCTION get_device_stats(
    p_device_id UUID,
    p_metric VARCHAR(100),
    p_interval INTERVAL DEFAULT '24 hours'
)
RETURNS TABLE (
    avg_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        AVG(value) AS avg_value,
        MAX(value) AS max_value,
        MIN(value) AS min_value,
        COUNT(*) AS count
    FROM telemetry
    WHERE device_id = p_device_id
      AND metric = p_metric
      AND time > NOW() - p_interval;
END;
$$ LANGUAGE plpgsql;

-- 插入测试数据（可选）
DO $$
BEGIN
    -- 插入一些示例数据用于测试
    INSERT INTO telemetry (time, tenant_id, device_id, metric, value, unit)
    SELECT
        NOW() - (i || ' minutes')::INTERVAL,
        '00000000-0000-0000-0000-000000000001'::UUID,
        '00000000-0000-0000-0000-000000000001'::UUID,
        'temperature',
        20 + random() * 10,
        '°C'
    FROM generate_series(1, 100) AS i;
    
    -- 插入湿度数据
    INSERT INTO telemetry (time, tenant_id, device_id, metric, value, unit)
    SELECT
        NOW() - (i || ' minutes')::INTERVAL,
        '00000000-0000-0000-0000-000000000001'::UUID,
        '00000000-0000-0000-0000-000000000001'::UUID,
        'humidity',
        50 + random() * 20,
        '%'
    FROM generate_series(1, 100) AS i;
END $$;

-- 完成
SELECT 'TimescaleDB initialization completed' AS status;
SELECT format('Total telemetry rows: %s', COUNT(*)) FROM telemetry;

