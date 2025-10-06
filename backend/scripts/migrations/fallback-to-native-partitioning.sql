-- ==========================================
-- 降级策略：从 TimescaleDB 回退到原生分区
-- 用于 TimescaleDB 不可用时的备选方案
-- ==========================================

-- 检查是否需要降级
DO $$ 
DECLARE
  has_timescale BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
  ) INTO has_timescale;
  
  IF has_timescale THEN
    RAISE NOTICE 'TimescaleDB is available, no fallback needed';
    RETURN;
  END IF;
  
  RAISE NOTICE 'TimescaleDB not available, setting up native partitioning...';
END $$;

-- ==========================================
-- 1. Telemetry 表原生分区（按月）
-- ==========================================

-- 删除已存在的表（如果是从 Hypertable 转换）
-- DROP TABLE IF EXISTS telemetry CASCADE;

-- 创建分区主表
CREATE TABLE IF NOT EXISTS telemetry (
  id VARCHAR(30) NOT NULL,
  tenant_id VARCHAR(30) NOT NULL,
  device_id VARCHAR(30) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  metrics JSONB DEFAULT '{}',
  quality VARCHAR(20) DEFAULT 'GOOD',
  protocol VARCHAR(20) NOT NULL,
  source VARCHAR(100) NOT NULL
) PARTITION BY RANGE (timestamp);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_telemetry_tenant_device_time
  ON telemetry (tenant_id, device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp
  ON telemetry (timestamp);

-- 创建未来12个月的分区
DO $$
DECLARE
  partition_date DATE := DATE_TRUNC('month', NOW());
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  FOR i IN 0..11 LOOP
    start_date := partition_date + (i || ' months')::INTERVAL;
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'telemetry_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF telemetry
       FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    
    RAISE NOTICE 'Created partition: %', partition_name;
  END LOOP;
END $$;

-- ==========================================
-- 2. DeviceStatusHistory 表原生分区（按月）
-- ==========================================

CREATE TABLE IF NOT EXISTS device_status_history (
  id VARCHAR(30) NOT NULL,
  tenant_id VARCHAR(30) NOT NULL,
  device_id VARCHAR(30) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL,
  context JSONB DEFAULT '{}'
) PARTITION BY RANGE (timestamp);

CREATE INDEX IF NOT EXISTS idx_device_status_tenant_device_time
  ON device_status_history (tenant_id, device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_device_status_timestamp
  ON device_status_history (timestamp);

-- 创建未来12个月的分区
DO $$
DECLARE
  partition_date DATE := DATE_TRUNC('month', NOW());
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  FOR i IN 0..11 LOOP
    start_date := partition_date + (i || ' months')::INTERVAL;
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'device_status_history_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF device_status_history
       FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
    
    RAISE NOTICE 'Created partition: %', partition_name;
  END LOOP;
END $$;

-- ==========================================
-- 3. 自动分区维护函数
-- ==========================================

CREATE OR REPLACE FUNCTION create_next_month_partitions()
RETURNS void AS $$
DECLARE
  next_month DATE := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  partition_name TEXT;
  end_date DATE;
BEGIN
  -- Telemetry 分区
  partition_name := 'telemetry_' || TO_CHAR(next_month, 'YYYY_MM');
  end_date := next_month + INTERVAL '1 month';
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF telemetry
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, next_month, end_date
  );
  
  -- DeviceStatusHistory 分区
  partition_name := 'device_status_history_' || TO_CHAR(next_month, 'YYYY_MM');
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF device_status_history
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, next_month, end_date
  );
  
  RAISE NOTICE 'Created partitions for: %', TO_CHAR(next_month, 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. 定时任务：每月自动创建分区（需要 pg_cron）
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- 每月1号创建下个月分区
    PERFORM cron.schedule(
      'create-monthly-partitions',
      '0 0 1 * *',
      'SELECT create_next_month_partitions()'
    );
    RAISE NOTICE 'Scheduled monthly partition creation';
  ELSE
    RAISE NOTICE 'pg_cron not available, manual partition maintenance required';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to schedule partition creation: %', SQLERRM;
END $$;

-- ==========================================
-- 5. 数据清理函数（模拟保留策略）
-- ==========================================

CREATE OR REPLACE FUNCTION cleanup_old_partitions(
  table_name TEXT,
  retention_months INTEGER DEFAULT 36
)
RETURNS void AS $$
DECLARE
  cutoff_date DATE := DATE_TRUNC('month', NOW() - (retention_months || ' months')::INTERVAL);
  partition_record RECORD;
BEGIN
  FOR partition_record IN
    SELECT
      child.relname AS partition_name
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    WHERE parent.relname = table_name
      AND child.relname < table_name || '_' || TO_CHAR(cutoff_date, 'YYYY_MM')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', partition_record.partition_name);
    RAISE NOTICE 'Dropped old partition: %', partition_record.partition_name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 定时清理（每月执行一次）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-old-partitions',
      '0 2 1 * *',
      $$
        SELECT cleanup_old_partitions('telemetry', 36);
        SELECT cleanup_old_partitions('device_status_history', 12);
      $$
    );
    RAISE NOTICE 'Scheduled partition cleanup';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to schedule partition cleanup: %', SQLERRM;
END $$;

-- ==========================================
-- 6. 验证配置
-- ==========================================

-- 查看所有分区
SELECT 
  parent.relname AS table_name,
  child.relname AS partition_name,
  pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname IN ('telemetry', 'device_status_history')
ORDER BY parent.relname, child.relname;

-- ==========================================
-- 完成！原生分区已配置
-- ==========================================

