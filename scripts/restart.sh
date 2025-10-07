#!/bin/bash

# IoT 平台智能重启脚本
# 功能：智能重启所有服务，自动检测并修复常见问题

set -e

echo "🔄 IoT 平台智能重启脚本"
echo "========================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${BLUE}ℹ️  [INFO]${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠️  [WARNING]${NC} $1"; }
log_error() { echo -e "${RED}❌ [ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}✅ [SUCCESS]${NC} $1"; }
log_executing() { echo -e "${PURPLE}🚀 [EXECUTING]${NC} $1"; }

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

# 检查Docker服务状态
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker服务未运行，请先启动Docker"
        exit 1
    fi
    log_success "Docker服务正常"
}

# 检查端口占用
check_ports() {
    local ports=(3000 8000 5432 6379 1883 18083)
    local conflicts=()
    
    for port in "${ports[@]}"; do
        if lsof -i :$port >/dev/null 2>&1; then
            conflicts+=($port)
        fi
    done
    
    if [ ${#conflicts[@]} -gt 0 ]; then
        log_warning "检测到端口冲突: ${conflicts[*]}"
        return 1
    fi
    return 0
}

# 清理冲突容器
clean_conflicting_containers() {
    log_executing "检查并清理冲突容器..."
    
    # 检查3000端口占用
    local frontend_conflict=$(docker ps --format "table {{.Names}}\t{{.Ports}}" | grep ":3000->" | awk '{print $1}' | head -1)
    if [ ! -z "$frontend_conflict" ] && [ "$frontend_conflict" != "iot-frontend" ]; then
        log_warning "发现冲突的前端容器: $frontend_conflict"
        docker stop "$frontend_conflict" 2>/dev/null || true
        log_success "已停止冲突容器: $frontend_conflict"
    fi
    
    # 检查其他可能的冲突
    local conflict_containers=$(docker ps -a --format "{{.Names}}" | grep -E "(iot-.*-final|.*_iot-.*)" | grep -v "iot-frontend\|iot-backend\|iot-postgres\|iot-redis\|iot-emqx" || true)
    if [ ! -z "$conflict_containers" ]; then
        log_warning "发现其他冲突容器: $conflict_containers"
        echo "$conflict_containers" | xargs docker stop 2>/dev/null || true
        log_success "已清理冲突容器"
    fi
}

# 检查容器配置问题
check_container_config() {
    log_executing "检查容器配置..."
    
    # 检查是否有损坏的容器
    local broken_containers=$(docker ps -a --format "{{.Names}}\t{{.Status}}" | grep -E "(Exited|Dead)" | awk '{print $1}' || true)
    
    if [ ! -z "$broken_containers" ]; then
        log_warning "发现异常容器: $broken_containers"
        echo "$broken_containers" | xargs docker rm -f 2>/dev/null || true
        log_success "已清理异常容器"
    fi
}

# 检查服务健康状态
check_service_health() {
    log_executing "检查服务健康状态..."
    
    # 等待服务启动
    sleep 5
    
    # 检查后端健康状态
    if curl -s -f http://localhost:8000/health >/dev/null 2>&1; then
        log_success "后端服务健康"
    else
        log_warning "后端服务可能有问题"
        return 1
    fi
    
    # 检查前端服务
    if curl -s -f http://localhost:3000 >/dev/null 2>&1; then
        log_success "前端服务健康"
    else
        log_warning "前端服务可能有问题"
        return 1
    fi
    
    return 0
}

# 智能重启服务
smart_restart() {
    log_executing "开始智能重启流程..."
    
    # 1. 检查Docker服务
    check_docker
    
    # 2. 检查端口冲突
    if ! check_ports; then
        log_warning "检测到端口冲突，尝试清理..."
        clean_conflicting_containers
    fi
    
    # 3. 检查容器配置
    check_container_config
    
    # 4. 尝试正常重启
    log_executing "尝试正常重启服务..."
    if docker-compose restart 2>/dev/null; then
        log_success "正常重启成功"
        return 0
    else
        log_warning "正常重启失败，尝试重建..."
        return 1
    fi
}

# 重建服务
rebuild_services() {
    log_executing "开始重建服务..."
    
    # 停止所有服务
    log_executing "停止所有服务..."
    docker-compose down 2>/dev/null || true
    
    # 清理冲突容器
    clean_conflicting_containers
    
    # 重建前端（最常见的问题）
    log_executing "重建前端服务..."
    docker-compose build frontend
    
    # 启动所有服务
    log_executing "启动所有服务..."
    docker-compose up -d
    
    log_success "服务重建完成"
}

# 主重启流程
main_restart() {
    log_executing "开始重启流程..."
    
    # 尝试智能重启
    if smart_restart; then
        log_success "智能重启成功"
    else
        log_warning "智能重启失败，开始重建服务..."
        rebuild_services
    fi
    
    # 等待服务启动
    log_executing "等待服务启动..."
    sleep 10
    
    # 检查服务健康状态
    if check_service_health; then
        log_success "所有服务健康运行"
    else
        log_warning "部分服务可能有问题，请检查日志"
    fi
}

# 显示服务状态
show_status() {
    echo ""
    log_executing "当前服务状态："
    docker-compose ps
    
    echo ""
    log_executing "端口占用情况："
    lsof -i :3000 -i :8000 -i :5432 -i :6379 -i :1883 -i :18083 2>/dev/null || echo "无端口冲突"
    
    echo ""
    log_executing "服务健康检查："
    
    # 检查后端
    if curl -s -f http://localhost:8000/health >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ 后端服务 (8000)${NC}"
    else
        echo -e "  ${RED}❌ 后端服务 (8000)${NC}"
    fi
    
    # 检查前端
    if curl -s -f http://localhost:3000 >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ 前端服务 (3000)${NC}"
    else
        echo -e "  ${RED}❌ 前端服务 (3000)${NC}"
    fi
    
    # 检查数据库
    if docker exec iot-postgres pg_isready -U iot_user -d iot_platform >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ PostgreSQL (5432)${NC}"
    else
        echo -e "  ${RED}❌ PostgreSQL (5432)${NC}"
    fi
    
    # 检查Redis
    if docker exec iot-redis redis-cli ping >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Redis (6379)${NC}"
    else
        echo -e "  ${RED}❌ Redis (6379)${NC}"
    fi
    
    # 检查EMQX
    if curl -s -f http://localhost:18083 >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ EMQX MQTT (1883)${NC}"
    else
        echo -e "  ${RED}❌ EMQX MQTT (1883)${NC}"
    fi
}

# 执行主流程
main_restart

# 显示最终状态
show_status

echo ""
log_success "🎉 重启流程完成！"
echo -e "${BLUE}💡 提示：如果遇到问题，可以运行 'docker-compose logs -f' 查看详细日志${NC}"
