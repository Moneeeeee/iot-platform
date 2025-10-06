-- ==========================================
-- 数据库初始化：扩展与基础配置
-- 支持 TimescaleDB 和标准 PostgreSQL 双模式
-- ==========================================

-- 1. 创建基础扩展（通用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 文本搜索
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- 复合索引优化
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- 性能监控

-- 2. 尝试启用 TimescaleDB（可选）
DO $$ 
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
  RAISE NOTICE 'TimescaleDB extension enabled successfully';
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB not available, using standard PostgreSQL';
END $$;

-- 3. 创建配置表用于存储数据库模式
CREATE TABLE IF NOT EXISTS _db_config (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 记录是否启用了 TimescaleDB
INSERT INTO _db_config (key, value)
VALUES ('timescaledb_enabled', 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') 
    THEN 'true' 
    ELSE 'false' 
  END
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. 性能优化配置
-- 增加共享缓冲区（适用于时序数据）
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- 重新加载配置
SELECT pg_reload_conf();

-- ==========================================
-- 完成初始化
-- ==========================================

