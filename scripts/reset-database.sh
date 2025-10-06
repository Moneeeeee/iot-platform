#!/bin/bash

# IoT 平台数据库完全重置脚本
# 警告：此脚本会删除所有数据库数据！

set -e

echo "⚠️  IoT 平台数据库完全重置脚本"
echo "=================================="
echo -e "${RED}警告：此操作将删除所有数据库数据！${NC}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ 错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

echo -e "${RED}📋 此操作将：${NC}"
echo "  ❌ 删除所有数据库数据"
echo "  ❌ 删除所有用户数据"
echo "  ❌ 删除所有设备数据"
echo "  ❌ 删除所有遥测数据"
echo ""

# 双重确认
echo -e "${YELLOW}请确认您要完全重置数据库！${NC}"
read -p "输入 'RESET' 确认重置: " -r
if [[ ! $REPLY == "RESET" ]]; then
    echo -e "${YELLOW}⏹️  操作已取消${NC}"
    exit 0
fi

echo ""
echo -e "${RED}最后确认：这将永久删除所有数据！${NC}"
read -p "输入 'YES' 最终确认: " -r
if [[ ! $REPLY == "YES" ]]; then
    echo -e "${YELLOW}⏹️  操作已取消${NC}"
    exit 0
fi

echo -e "${BLUE}🔄 开始重置数据库...${NC}"

# 停止服务
echo "  - 停止所有服务..."
docker-compose down

# 删除数据库卷
echo "  - 删除数据库卷..."
docker volume rm iot-platform_postgres_data 2>/dev/null || true

# 重新启动服务
echo "  - 重新启动服务..."
docker-compose up -d postgres redis

# 等待数据库启动
echo "  - 等待数据库启动..."
sleep 15

# 初始化数据库
echo "  - 初始化数据库..."
cd backend
npx prisma db push
node scripts/setup/create-initial-data.js

# 配置 TimescaleDB
echo "  - 配置 TimescaleDB..."
docker exec iot-postgres psql -U iot_user -d iot_platform -c "ALTER TABLE telemetry DROP CONSTRAINT IF EXISTS telemetry_pkey;" >/dev/null 2>&1 || true
docker exec iot-postgres psql -U iot_user -d iot_platform -c "ALTER TABLE device_status_history DROP CONSTRAINT IF EXISTS device_status_history_pkey;" >/dev/null 2>&1 || true
docker exec iot-postgres psql -U iot_user -d iot_platform -c "SELECT create_hypertable('telemetry', 'timestamp', chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE);" >/dev/null 2>&1 || true
docker exec iot-postgres psql -U iot_user -d iot_platform -c "SELECT create_hypertable('device_status_history', 'timestamp', chunk_time_interval => INTERVAL '30 days', if_not_exists => TRUE);" >/dev/null 2>&1 || true
docker exec iot-postgres psql -U iot_user -d iot_platform -c "ALTER TABLE telemetry ADD CONSTRAINT telemetry_pkey PRIMARY KEY (id, timestamp);" >/dev/null 2>&1 || true
docker exec iot-postgres psql -U iot_user -d iot_platform -c "ALTER TABLE device_status_history ADD CONSTRAINT device_status_history_pkey PRIMARY KEY (id, timestamp);" >/dev/null 2>&1 || true

cd ..

# 启动所有服务
echo "  - 启动所有服务..."
docker-compose up -d

echo ""
echo -e "${GREEN}🎉 数据库重置完成！${NC}"
echo "================================"
echo -e "${BLUE}🔐 默认登录信息：${NC}"
echo "  - 用户名: admin"
echo "  - 密码: admin123"
echo "  - 邮箱: admin@iot-platform.com"
echo ""
echo -e "${YELLOW}⚠️  请立即修改默认密码！${NC}"
