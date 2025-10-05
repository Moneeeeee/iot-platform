-- 数据库初始化脚本
-- IoT设备管理平台数据库初始化

-- 创建数据库（如果不存在）
-- CREATE DATABASE IF NOT EXISTS iot_platform;

-- 使用数据库
-- \c iot_platform;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建枚举类型
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE language AS ENUM ('zh-CN', 'zh-TW', 'en');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE device_type AS ENUM ('SMART_SENSOR', 'SMART_GATEWAY', 'SMART_CONTROLLER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE device_status AS ENUM ('ONLINE', 'OFFLINE', 'ERROR', 'MAINTENANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE protocol_type AS ENUM ('MQTT', 'TCP', 'UDP', 'HTTP', 'HTTPS', 'WEBSOCKET');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_level AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('ACTIVE', 'RESOLVED', 'SUPPRESSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE log_level AS ENUM ('ERROR', 'WARN', 'INFO', 'DEBUG');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'VIEWER',
    permissions TEXT[] DEFAULT '{}',
    language language DEFAULT 'zh-CN',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建设备表
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type device_type NOT NULL,
    status device_status DEFAULT 'OFFLINE',
    config JSONB DEFAULT '{}',
    capabilities TEXT[] DEFAULT '{}',
    last_seen_at TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建设备数据表
CREATE TABLE IF NOT EXISTS device_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    protocol protocol_type NOT NULL,
    source VARCHAR(100) NOT NULL
);

-- 创建告警表
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    level alert_level NOT NULL,
    status alert_status DEFAULT 'ACTIVE',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    triggered_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP
);

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建日志表
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level log_level NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    user_id UUID REFERENCES users(id),
    device_id UUID REFERENCES devices(id),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- 创建用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建文件上传表
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    path VARCHAR(500) NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建设备模板表
CREATE TABLE IF NOT EXISTS device_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    type device_type NOT NULL,
    description TEXT,
    config JSONB DEFAULT '{}',
    capabilities TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建系统统计表
CREATE TABLE IF NOT EXISTS system_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    total_devices INTEGER DEFAULT 0,
    online_devices INTEGER DEFAULT 0,
    total_alerts INTEGER DEFAULT 0,
    active_alerts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_devices_slug ON devices(slug);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen_at ON devices(last_seen_at);

CREATE INDEX IF NOT EXISTS idx_device_data_device_id ON device_data(device_id);
CREATE INDEX IF NOT EXISTS idx_device_data_timestamp ON device_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_device_data_protocol ON device_data(protocol);

CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at);

CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_device_id ON logs(device_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at);

CREATE INDEX IF NOT EXISTS idx_device_templates_type ON device_templates(type);
CREATE INDEX IF NOT EXISTS idx_device_templates_is_active ON device_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_system_stats_date ON system_stats(date);

-- 插入默认管理员用户
INSERT INTO users (username, email, password_hash, role, permissions, language, is_active)
VALUES (
    'admin',
    'admin@iot-platform.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2O', -- password: admin123
    'ADMIN',
    ARRAY['user:create', 'user:read', 'user:update', 'user:delete', 'device:create', 'device:read', 'device:update', 'device:delete', 'device:control', 'system:config', 'system:logs', 'system:monitor'],
    'zh-CN',
    true
) ON CONFLICT (username) DO NOTHING;

-- 插入默认系统配置
INSERT INTO system_configs (key, value) VALUES
('site_name', '"IoT设备管理平台"'),
('site_description', '"专业的物联网设备管理平台"'),
('default_language', '"zh-CN"'),
('timezone', '"Asia/Shanghai"'),
('maintenance_mode', 'false'),
('mqtt_broker_url', '"mqtt://localhost:1883"'),
('mqtt_username', '""'),
('mqtt_password', '""'),
('mqtt_client_id', '"iot-platform-gateway"'),
('mqtt_keep_alive', '60'),
('mqtt_reconnect_period', '5000'),
('mqtt_connect_timeout', '30000'),
('udp_port', '8888'),
('udp_host', '"0.0.0.0"'),
('udp_timeout', '30000'),
('udp_max_packet_size', '65536'),
('email_notifications', 'true'),
('webhook_url', '""'),
('sms_enabled', 'false'),
('alert_retention_days', '30'),
('jwt_secret', '"your-super-secret-jwt-key-change-this-in-production"'),
('jwt_expires_in', '"7d"'),
('password_min_length', '6'),
('max_login_attempts', '5'),
('lockout_duration', '300000'),
('require_email_verification', 'false')
ON CONFLICT (key) DO NOTHING;

-- 插入示例设备模板
INSERT INTO device_templates (name, type, description, config, capabilities, is_active) VALUES
(
    '温度传感器模板',
    'SMART_SENSOR',
    '用于监测环境温度的智能传感器',
    '{"protocols": [{"type": "MQTT", "enabled": true, "topics": {"data": "sensor/{deviceId}/data", "control": "sensor/{deviceId}/control"}}], "dashboard": {"widgets": [{"type": "chart", "title": "温度趋势", "dataSource": "temperature"}]}}',
    ARRAY['temperature', 'humidity'],
    true
),
(
    '智能网关模板',
    'SMART_GATEWAY',
    '支持多种通信协议的智能网关',
    '{"protocols": [{"type": "MQTT", "enabled": true}, {"type": "UDP", "enabled": true, "port": 8888}], "dashboard": {"widgets": [{"type": "status", "title": "连接状态"}]}}',
    ARRAY['data_forwarding', 'protocol_conversion', 'edge_computing'],
    true
),
(
    '智能控制器模板',
    'SMART_CONTROLLER',
    '支持远程控制的智能控制器',
    '{"protocols": [{"type": "MQTT", "enabled": true}, {"type": "HTTP", "enabled": true}], "dashboard": {"widgets": [{"type": "control", "title": "设备控制"}]}}',
    ARRAY['remote_control', 'automation', 'scheduling'],
    true
)
ON CONFLICT DO NOTHING;

-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表创建更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_templates_updated_at BEFORE UPDATE ON device_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建数据清理函数
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- 清理过期的用户会话
    DELETE FROM user_sessions WHERE expires_at < NOW();
    
    -- 清理过期的设备数据（保留30天）
    DELETE FROM device_data WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- 清理已解决的告警（保留30天）
    DELETE FROM alerts WHERE status = 'RESOLVED' AND resolved_at < NOW() - INTERVAL '30 days';
    
    -- 清理旧日志（保留7天）
    DELETE FROM logs WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 创建统计更新函数
CREATE OR REPLACE FUNCTION update_daily_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO system_stats (date, total_users, total_devices, online_devices, total_alerts, active_alerts)
    SELECT 
        CURRENT_DATE,
        (SELECT COUNT(*) FROM users WHERE is_active = true),
        (SELECT COUNT(*) FROM devices),
        (SELECT COUNT(*) FROM devices WHERE status = 'ONLINE'),
        (SELECT COUNT(*) FROM alerts),
        (SELECT COUNT(*) FROM alerts WHERE status = 'ACTIVE')
    ON CONFLICT (date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        total_devices = EXCLUDED.total_devices,
        online_devices = EXCLUDED.online_devices,
        total_alerts = EXCLUDED.total_alerts,
        active_alerts = EXCLUDED.active_alerts;
END;
$$ LANGUAGE plpgsql;

-- 完成初始化
COMMENT ON DATABASE iot_platform IS 'IoT设备管理平台数据库';
