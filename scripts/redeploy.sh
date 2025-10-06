#!/bin/bash

# IoT 平台一键重新部署脚本
# 功能：关闭服务，清理缓存和垃圾，重新部署，保留数据库数据

set -e

echo "🚀 IoT 平台一键重新部署脚本"
echo "================================"

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

echo -e "${BLUE}📋 当前操作：${NC}"
echo "  ✓ 停止所有服务"
echo "  ✓ 清理构建缓存和垃圾文件"
echo "  ✓ 保留数据库数据"
echo "  ✓ 重新构建和启动服务"
echo ""

# 询问用户确认
read -p "是否继续？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏹️  操作已取消${NC}"
    exit 0
fi

echo -e "${BLUE}🔄 步骤 1/5: 停止所有服务...${NC}"
docker-compose down
echo -e "${GREEN}✅ 服务已停止${NC}"

echo -e "${BLUE}🧹 步骤 2/5: 清理构建缓存和垃圾文件...${NC}"

# 清理 node_modules
echo "  - 清理 node_modules..."
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# 清理 Next.js 构建缓存
echo "  - 清理 .next 构建缓存..."
find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true

# 清理 dist 目录
echo "  - 清理 dist 目录..."
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

# 清理日志文件
echo "  - 清理日志文件..."
find . -name "*.log" -type f -delete 2>/dev/null || true

# 清理临时文件
echo "  - 清理临时文件..."
find . -name "*.tmp" -type f -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -delete 2>/dev/null || true

# 清理 Docker 构建缓存
echo "  - 清理 Docker 构建缓存..."
docker builder prune -f >/dev/null 2>&1 || true

echo -e "${GREEN}✅ 缓存和垃圾文件已清理${NC}"

echo -e "${BLUE}🐳 步骤 3/5: 清理 Docker 系统垃圾...${NC}"
# 只清理未使用的镜像和容器，不清理卷
docker system prune -f >/dev/null 2>&1 || true
echo -e "${GREEN}✅ Docker 系统垃圾已清理${NC}"

echo -e "${BLUE}🔨 步骤 4/5: 重新构建和启动服务...${NC}"
docker-compose up -d --build
echo -e "${GREEN}✅ 服务已重新构建和启动${NC}"

echo -e "${BLUE}⏳ 步骤 5/5: 等待服务启动...${NC}"
echo "等待数据库启动..."
sleep 15

# 检查数据库是否需要初始化
echo "检查数据库状态..."
if docker exec iot-postgres psql -U iot_user -d iot_platform -c "SELECT 1 FROM tenants LIMIT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 数据库数据已存在，跳过初始化${NC}"
else
    echo -e "${YELLOW}⚠️  数据库为空，开始初始化...${NC}"
    
    # 应用数据库 schema
    echo "  - 应用数据库 schema..."
    cd backend && npx prisma db push >/dev/null 2>&1
    
    # 创建初始数据
    echo "  - 创建初始数据..."
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
    echo -e "${GREEN}✅ 数据库初始化完成${NC}"
fi

echo ""
echo -e "${GREEN}🎉 重新部署完成！${NC}"
echo "================================"

# 显示服务状态
echo -e "${BLUE}📊 服务状态：${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}🔗 服务地址：${NC}"
echo "  - 前端: http://localhost:3000"
echo "  - 后端 API: http://localhost:8000"
echo "  - API 文档: http://localhost:8000/api-docs"
echo "  - MQTT: mqtt://localhost:1883"
echo "  - EMQX Dashboard: http://localhost:18083"
echo "  - PostgreSQL: postgresql://localhost:5432/iot_platform"
echo "  - Redis: redis://localhost:6379"

echo ""
echo -e "${BLUE}🔐 登录信息：${NC}"
echo "  - 用户名: admin"
echo "  - 密码: admin123"
echo "  - 邮箱: admin@iot-platform.com"

echo ""
echo -e "${YELLOW}⚠️  重要提示：${NC}"
echo "  - 请立即修改默认密码"
echo "  - 数据库数据已保留"
echo "  - 如需完全重置数据库，请使用: ./scripts/reset-database.sh"

echo ""
echo -e "${GREEN}✨ 部署完成！${NC}"
