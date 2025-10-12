-- PostgreSQL 初始化脚本
-- Fountain IoT Platform

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建平台 Schema（存储租户信息等全局数据）
CREATE SCHEMA IF NOT EXISTS platform;

-- 租户表
CREATE TABLE IF NOT EXISTS platform.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    plan VARCHAR(50) DEFAULT 'free',
    
    -- 配额
    quota_devices INT DEFAULT 100,
    quota_users INT DEFAULT 10,
    quota_storage_gb INT DEFAULT 10,
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_tenants_slug ON platform.tenants(slug);
CREATE INDEX idx_tenants_status ON platform.tenants(status);
CREATE INDEX idx_tenants_created_at ON platform.tenants(created_at);

-- 系统用户表（平台管理员）
CREATE TABLE IF NOT EXISTS platform.system_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'active',
    
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建默认租户（用于开发测试）
INSERT INTO platform.tenants (name, slug, status, plan, quota_devices, quota_users)
VALUES 
    ('默认租户', 'default', 'active', 'enterprise', 10000, 100),
    ('演示租户', 'demo', 'active', 'pro', 1000, 50)
ON CONFLICT (slug) DO NOTHING;

-- 为默认租户创建独立 Schema
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN SELECT id, slug FROM platform.tenants LOOP
        -- 创建租户 Schema
        EXECUTE format('CREATE SCHEMA IF NOT EXISTS tenant_%s', replace(tenant_record.slug, '-', '_'));
        
        -- 创建租户的用户表
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS tenant_%s.users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
                email VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                role VARCHAR(50) DEFAULT ''user'',
                status VARCHAR(20) DEFAULT ''active'',
                
                metadata JSONB DEFAULT ''{}'',
                
                last_login_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(tenant_id, email)
            )', replace(tenant_record.slug, '-', '_'));
        
        -- 创建租户的设备表
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS tenant_%s.devices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
                device_id VARCHAR(100) NOT NULL,
                name VARCHAR(255),
                type VARCHAR(50),
                protocol VARCHAR(20) DEFAULT ''mqtt'',
                status VARCHAR(20) DEFAULT ''offline'',
                
                -- 设备配置
                config JSONB DEFAULT ''{}'',
                metadata JSONB DEFAULT ''{}'',
                tags TEXT[],
                
                -- 影子状态
                shadow_reported JSONB,
                shadow_desired JSONB,
                
                -- 设备认证
                token_hash VARCHAR(255),
                certificate TEXT,
                
                -- 统计信息
                last_seen_at TIMESTAMP,
                last_ip VARCHAR(50),
                message_count BIGINT DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(tenant_id, device_id)
            )', replace(tenant_record.slug, '-', '_'));
        
        -- 创建设备分组表
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS tenant_%s.device_groups (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                parent_id UUID REFERENCES tenant_%s.device_groups(id),
                
                metadata JSONB DEFAULT ''{}'',
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(tenant_id, name)
            )', replace(tenant_record.slug, '-', '_'), replace(tenant_record.slug, '-', '_'));
        
        -- 创建设备-分组关系表
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS tenant_%s.device_group_members (
                device_id UUID NOT NULL REFERENCES tenant_%s.devices(id),
                group_id UUID NOT NULL REFERENCES tenant_%s.device_groups(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                PRIMARY KEY (device_id, group_id)
            )', 
            replace(tenant_record.slug, '-', '_'),
            replace(tenant_record.slug, '-', '_'),
            replace(tenant_record.slug, '-', '_'));
        
        -- 创建规则表
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS tenant_%s.rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(20) DEFAULT ''enabled'',
                
                -- 规则配置
                conditions JSONB NOT NULL,
                actions JSONB NOT NULL,
                
                -- 执行统计
                trigger_count BIGINT DEFAULT 0,
                last_triggered_at TIMESTAMP,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )', replace(tenant_record.slug, '-', '_'));
        
        -- 创建告警表
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS tenant_%s.alarms (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
                device_id UUID REFERENCES tenant_%s.devices(id),
                rule_id UUID REFERENCES tenant_%s.rules(id),
                
                level VARCHAR(20) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                status VARCHAR(20) DEFAULT ''active'',
                
                -- 告警数据
                data JSONB,
                
                -- 处理信息
                acknowledged_by UUID,
                acknowledged_at TIMESTAMP,
                resolved_at TIMESTAMP,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )', 
            replace(tenant_record.slug, '-', '_'),
            replace(tenant_record.slug, '-', '_'),
            replace(tenant_record.slug, '-', '_'));
        
        -- 创建 OTA 任务表
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS tenant_%s.ota_tasks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
                name VARCHAR(255) NOT NULL,
                firmware_version VARCHAR(50) NOT NULL,
                firmware_url TEXT NOT NULL,
                firmware_md5 VARCHAR(32),
                firmware_size BIGINT,
                
                target_devices UUID[],
                status VARCHAR(20) DEFAULT ''pending'',
                
                -- 升级策略
                strategy VARCHAR(20) DEFAULT ''all'',
                batch_size INT DEFAULT 10,
                batch_interval INT DEFAULT 300,
                
                -- 统计信息
                total_devices INT DEFAULT 0,
                success_count INT DEFAULT 0,
                failed_count INT DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP
            )', replace(tenant_record.slug, '-', '_'));
        
        -- 创建索引
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_devices_status ON tenant_%s.devices(status)', replace(tenant_record.slug, '-', '_'));
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_devices_type ON tenant_%s.devices(type)', replace(tenant_record.slug, '-', '_'));
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON tenant_%s.devices(last_seen_at)', replace(tenant_record.slug, '-', '_'));
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_alarms_status ON tenant_%s.alarms(status)', replace(tenant_record.slug, '-', '_'));
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_alarms_level ON tenant_%s.alarms(level)', replace(tenant_record.slug, '-', '_'));
        
    END LOOP;
END $$;

-- 创建更新时间戳的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加自动更新触发器
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN SELECT slug FROM platform.tenants LOOP
        EXECUTE format('
            CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON tenant_%s.users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            replace(tenant_record.slug, '-', '_'));
        
        EXECUTE format('
            CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON tenant_%s.devices
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            replace(tenant_record.slug, '-', '_'));
    END LOOP;
END $$;

-- 完成
SELECT 'PostgreSQL initialization completed' AS status;

