#!/bin/bash

# IoT Platform Redeploy Script
# 完整重新部署：停止 -> 清理 -> 构建 -> 启动

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

log_info "开始完整重新部署 IoT Platform..."

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

# 第一步：停止所有服务
log_info "=== 第一步：停止所有服务 ==="
if $COMPOSE_CMD down; then
    log_success "服务已停止"
else
    log_warning "停止服务时出现警告，继续执行..."
fi

# 等待服务完全停止
log_info "等待服务完全停止..."
sleep 5

# 第二步：清理缓存和垃圾
log_info "=== 第二步：清理缓存和垃圾 ==="

# 清理 Docker 系统
log_info "清理 Docker 系统缓存..."
if docker system prune -f; then
    log_success "Docker 系统缓存已清理"
else
    log_warning "清理 Docker 系统缓存时出现警告"
fi

# 清理未使用的镜像
log_info "清理未使用的 Docker 镜像..."
if docker image prune -f; then
    log_success "未使用的 Docker 镜像已清理"
else
    log_warning "清理 Docker 镜像时出现警告"
fi

# 清理构建缓存
log_info "清理 Docker 构建缓存..."
if docker builder prune -f; then
    log_success "Docker 构建缓存已清理"
else
    log_warning "清理 Docker 构建缓存时出现警告"
fi

# 清理项目特定的缓存
log_info "清理项目缓存..."

# 清理 Node.js 缓存
if [ -d "frontend/node_modules" ]; then
    log_info "清理前端 node_modules..."
    rm -rf frontend/node_modules
    log_success "前端 node_modules 已清理"
fi

if [ -d "frontend/.next" ]; then
    log_info "清理前端 .next 缓存..."
    rm -rf frontend/.next
    log_success "前端 .next 缓存已清理"
fi

# 清理后端缓存
if [ -d "backend/node_modules" ]; then
    log_info "清理后端 node_modules..."
    rm -rf backend/node_modules
    log_success "后端 node_modules 已清理"
fi

if [ -d "backend/dist" ]; then
    log_info "清理后端 dist 目录..."
    rm -rf backend/dist
    log_success "后端 dist 目录已清理"
fi

# 清理 Docker 卷（可选，谨慎使用）
read -p "是否清理 Docker 数据卷？这将删除所有数据！(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_warning "清理 Docker 数据卷..."
    if $COMPOSE_CMD down -v; then
        log_success "Docker 数据卷已清理"
    else
        log_warning "清理 Docker 数据卷时出现警告"
    fi
else
    log_info "保留 Docker 数据卷"
fi

# 第三步：重新构建镜像
log_info "=== 第三步：重新构建镜像 ==="

# 询问是否使用 no-cache 构建
read -p "是否使用 --no-cache 构建？(推荐用于完整重建) (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    BUILD_ARGS=""
    log_info "使用缓存构建"
else
    BUILD_ARGS="--no-cache"
    log_info "使用 --no-cache 构建"
fi

log_info "开始构建镜像..."
if $COMPOSE_CMD build $BUILD_ARGS; then
    log_success "镜像构建完成"
else
    log_error "镜像构建失败"
    exit 1
fi

# 第四步：启动服务
log_info "=== 第四步：启动服务 ==="

log_info "启动所有服务..."
if $COMPOSE_CMD up -d; then
    log_success "服务启动命令已执行"
else
    log_error "启动服务失败"
    exit 1
fi

# 等待服务启动
log_info "等待服务启动完成..."
sleep 15

# 检查服务状态
log_info "检查服务状态..."
if $COMPOSE_CMD ps; then
    log_success "服务状态检查完成"
else
    log_warning "无法获取服务状态"
fi

# 检查健康状态
log_info "检查服务健康状态..."
sleep 10

# 检查关键服务是否可达
check_service() {
    local service_name=$1
    local port=$2
    local path=${3:-"/"}
    local max_attempts=${4:-10}
    
    log_info "检查 $service_name 服务..."
    
    for i in $(seq 1 $max_attempts); do
        if curl -fsS "http://localhost:$port$path" >/dev/null 2>&1; then
            log_success "$service_name 服务正常"
            return 0
        else
            log_info "等待 $service_name 服务启动... ($i/$max_attempts)"
            sleep 5
        fi
    done
    
    log_warning "$service_name 服务可能未就绪"
    return 1
}

# 检查各个服务
backend_ok=false
frontend_ok=false
nginx_ok=false

if check_service "Backend" "8000" "/healthz" 15; then
    backend_ok=true
fi

if check_service "Frontend" "3000" "/" 15; then
    frontend_ok=true
fi

if check_service "Nginx" "80" "/" 10; then
    nginx_ok=true
fi

# 总结
log_info "重新部署完成！"
echo ""
log_info "服务状态总结:"
echo "  - Backend (8000): $([ "$backend_ok" = true ] && echo -e "${GREEN}正常${NC}" || echo -e "${YELLOW}检查中${NC}")"
echo "  - Frontend (3000): $([ "$frontend_ok" = true ] && echo -e "${GREEN}正常${NC}" || echo -e "${YELLOW}检查中${NC}")"
echo "  - Nginx (80): $([ "$nginx_ok" = true ] && echo -e "${GREEN}正常${NC}" || echo -e "${YELLOW}检查中${NC}")"

if [ "$backend_ok" = true ] && [ "$frontend_ok" = true ] && [ "$nginx_ok" = true ]; then
    log_success "所有服务重新部署成功！"
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

# 显示资源使用情况
log_info "当前资源使用情况:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
