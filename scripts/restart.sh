#!/bin/bash

# IoT Platform Restart Script
# 重启所有服务，包含错误处理

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 错误处理函数
handle_error() {
    log_error "脚本执行失败，退出码: $1"
    log_error "请检查上述错误信息并重试"
    exit $1
}

# 设置错误处理
trap 'handle_error $?' ERR

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    log_error "未找到 docker-compose.yml 文件，请确保在项目根目录执行此脚本"
    exit 1
fi

log_info "开始重启 IoT Platform 服务..."

# 检查 Docker 是否运行
if ! docker info >/dev/null 2>&1; then
    log_error "Docker 未运行，请先启动 Docker 服务"
    exit 1
fi

# 检查 Docker Compose 是否可用
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    log_error "Docker Compose 不可用，请安装 Docker Compose"
    exit 1
fi

# 确定使用的 compose 命令
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

log_info "使用命令: $COMPOSE_CMD"

# 停止所有服务
log_info "正在停止所有服务..."
if $COMPOSE_CMD down; then
    log_success "服务已停止"
else
    log_warning "停止服务时出现警告，继续执行..."
fi

# 等待服务完全停止
log_info "等待服务完全停止..."
sleep 3

# 启动所有服务
log_info "正在启动所有服务..."
if $COMPOSE_CMD up -d; then
    log_success "服务启动命令已执行"
else
    log_error "启动服务失败"
    exit 1
fi

# 等待服务启动
log_info "等待服务启动完成..."
sleep 10

# 检查服务状态
log_info "检查服务状态..."
if $COMPOSE_CMD ps; then
    log_success "服务状态检查完成"
else
    log_warning "无法获取服务状态"
fi

# 检查健康状态
log_info "检查服务健康状态..."
sleep 5

# 检查关键服务是否可达
check_service() {
    local service_name=$1
    local port=$2
    local path=${3:-"/"}
    
    log_info "检查 $service_name 服务..."
    if curl -fsS "http://localhost:$port$path" >/dev/null 2>&1; then
        log_success "$service_name 服务正常"
        return 0
    else
        log_warning "$service_name 服务可能未就绪"
        return 1
    fi
}

# 检查各个服务
backend_ok=false
frontend_ok=false
nginx_ok=false

if check_service "Backend" "8000" "/healthz"; then
    backend_ok=true
fi

if check_service "Frontend" "3000"; then
    frontend_ok=true
fi

if check_service "Nginx" "80"; then
    nginx_ok=true
fi

# 总结
log_info "重启完成！"
echo ""
log_info "服务状态总结:"
echo "  - Backend (8000): $([ "$backend_ok" = true ] && echo -e "${GREEN}正常${NC}" || echo -e "${YELLOW}检查中${NC}")"
echo "  - Frontend (3000): $([ "$frontend_ok" = true ] && echo -e "${GREEN}正常${NC}" || echo -e "${YELLOW}检查中${NC}")"
echo "  - Nginx (80): $([ "$nginx_ok" = true ] && echo -e "${GREEN}正常${NC}" || echo -e "${YELLOW}检查中${NC}")"

if [ "$backend_ok" = true ] && [ "$frontend_ok" = true ] && [ "$nginx_ok" = true ]; then
    log_success "所有服务重启成功！"
    echo ""
    log_info "访问地址:"
    echo "  - Web界面: http://localhost"
    echo "  - API文档: http://localhost:8000/api/docs"
    echo "  - EMQX Dashboard: http://localhost:18083"
else
    log_warning "部分服务可能仍在启动中，请稍等片刻后访问 http://localhost"
fi

echo ""
log_info "使用 '$COMPOSE_CMD logs -f' 查看实时日志"
log_info "使用 '$COMPOSE_CMD ps' 查看服务状态"
