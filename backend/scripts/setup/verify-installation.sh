#!/bin/bash
# V2 安装验证脚本

set -e

echo "🔍 IoT 平台 V2 安装验证"
echo "=========================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    echo -e "${RED}✗${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. 检查 Docker 服务
echo "📦 检查 Docker 服务状态..."
services=("iot-postgres" "iot-redis" "iot-backend" "iot-frontend" "iot-emqx")
all_running=true

for service in "${services[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        status=$(docker inspect -f '{{.State.Status}}' "$service")
        if [ "$status" = "running" ]; then
            pass "$service: 运行中"
        else
            fail "$service: 状态异常 ($status)"
            all_running=false
        fi
    else
        fail "$service: 未找到"
        all_running=false
    fi
done
echo ""

# 2. 检查数据库连接
echo "🗄️  检查数据库连接..."
export PGPASSWORD="iot_password"

if psql -h localhost -p 5432 -U iot_user -d iot_platform -c "SELECT 1" > /dev/null 2>&1; then
    pass "数据库连接成功"
else
    fail "数据库连接失败"
fi
echo ""

# 3. 检查数据库表
echo "📋 检查数据库表..."
tables=$(psql -h localhost -p 5432 -U iot_user -d iot_platform -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

if [ "$tables" -gt 15 ]; then
    pass "数据库表已创建 ($tables 个表)"
else
    warn "数据库表数量较少 ($tables 个表)"
fi
echo ""

# 4. 检查租户和用户
echo "👥 检查初始数据..."

tenant_count=$(psql -h localhost -p 5432 -U iot_user -d iot_platform -t -c "SELECT COUNT(*) FROM tenants")
user_count=$(psql -h localhost -p 5432 -U iot_user -d iot_platform -t -c "SELECT COUNT(*) FROM users")
template_count=$(psql -h localhost -p 5432 -U iot_user -d iot_platform -t -c "SELECT COUNT(*) FROM device_templates")

if [ "$tenant_count" -gt 0 ]; then
    pass "租户数据: $tenant_count 个租户"
else
    fail "未找到租户数据"
fi

if [ "$user_count" -gt 0 ]; then
    pass "用户数据: $user_count 个用户"
else
    fail "未找到用户数据"
fi

if [ "$template_count" -gt 0 ]; then
    pass "设备模板: $template_count 个模板"
else
    warn "未找到设备模板"
fi
echo ""

# 5. 检查 TimescaleDB
echo "⏰ 检查 TimescaleDB..."
if psql -h localhost -p 5432 -U iot_user -d iot_platform -t -c "SELECT extname FROM pg_extension WHERE extname = 'timescaledb'" | grep -q "timescaledb"; then
    pass "TimescaleDB 扩展已启用"
    
    # 检查 Hypertables
    hypertables=$(psql -h localhost -p 5432 -U iot_user -d iot_platform -t -c "SELECT COUNT(*) FROM timescaledb_information.hypertables" 2>/dev/null || echo "0")
    if [ "$hypertables" -gt 0 ]; then
        pass "Hypertables: $hypertables 个"
    else
        warn "Hypertables 未配置"
    fi
else
    warn "TimescaleDB 扩展未启用（可选）"
fi
echo ""

# 6. 检查 API 健康状态
echo "🌐 检查 API 服务..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    health=$(curl -s http://localhost:8000/health | jq -r '.status' 2>/dev/null || echo "unknown")
    if [ "$health" = "healthy" ]; then
        pass "后端 API: 健康"
    else
        warn "后端 API: 状态 $health"
    fi
else
    fail "后端 API: 无响应"
fi
echo ""

# 7. 检查 Redis
echo "💾 检查 Redis..."
if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
    pass "Redis: 运行正常"
else
    fail "Redis: 连接失败"
fi
echo ""

# 8. 检查 MQTT Broker
echo "📡 检查 MQTT Broker..."
if curl -s http://localhost:18083/api/v5/nodes > /dev/null 2>&1; then
    pass "EMQX MQTT Broker: 运行正常"
else
    warn "EMQX MQTT Broker: 可能未就绪"
fi
echo ""

# 9. 显示登录信息
echo "============================================"
echo ""
echo "✨ 验证完成！"
echo ""
echo "📝 系统信息:"
echo "   - 租户数: $tenant_count"
echo "   - 用户数: $user_count"
echo "   - 设备模板: $template_count"
echo ""
echo "🔗 服务地址:"
echo "   - 前端: http://localhost:3000"
echo "   - 后端 API: http://localhost:8000"
echo "   - API 文档: http://localhost:8000/api-docs"
echo "   - MQTT: mqtt://localhost:1883"
echo "   - EMQX Dashboard: http://localhost:18083"
echo "   - PostgreSQL: postgresql://localhost:5432/iot_platform"
echo "   - Redis: redis://localhost:6379"
echo ""
echo "🔐 默认登录信息:"
echo "   - 用户名: admin"
echo "   - 密码: admin123"
echo "   - 邮箱: admin@iot-platform.com"
echo ""
echo "⚠️  重要提示:"
echo "   1. 请立即修改默认密码"
echo "   2. 如需启用 TimescaleDB，运行:"
echo "      bash backend/scripts/setup/enable-timescaledb-simple.sh"
echo ""
echo "📚 文档位置:"
echo "   - 架构设计: docs/architecture/V2-Architecture-Design.md"
echo "   - 实施总结: docs/V2-IMPLEMENTATION-SUMMARY.md"
echo "   - TimescaleDB: docs/deployment/timescaledb-installation.md"
echo "   - 数据库参考: docs/database/schema-v2-reference.md"
echo ""

