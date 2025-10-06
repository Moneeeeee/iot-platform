#!/bin/bash

# IoT设备管理平台部署脚本
# 用于快速部署整个平台到生产环境

set -e

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

# 检查Docker和Docker Compose是否安装
check_dependencies() {
    log_info "检查系统依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    log_success "系统依赖检查完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    # 创建uploads子目录结构
    mkdir -p uploads/{images/{avatars,devices,thumbnails,temp},documents/{manuals,certificates,reports},firmware/{ota,backup},exports/{data,logs,reports}}
    
    # 创建其他必要目录
    mkdir -p nginx/ssl
    mkdir -p logs
    
    # 创建.gitkeep文件保持目录结构
    touch uploads/.gitkeep
    find uploads/ -type d -exec touch {}/.gitkeep \;
    
    log_success "目录创建完成"
}

# 生成SSL证书（自签名，生产环境请使用正式证书）
generate_ssl_cert() {
    log_info "生成SSL证书..."
    
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=CN/ST=Beijing/L=Beijing/O=IoT Platform/OU=IT Department/CN=localhost"
        
        log_success "SSL证书生成完成"
    else
        log_info "SSL证书已存在，跳过生成"
    fi
}

# 创建环境配置文件
create_env_files() {
    log_info "创建环境配置文件..."
    
    # 后端环境配置
    if [ ! -f "backend/.env" ]; then
        cp backend/env.example backend/.env
        log_info "已创建后端环境配置文件，请根据需要修改"
    fi
    
    # 前端环境配置
    if [ ! -f "frontend/.env.local" ]; then
        cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
EOF
        log_info "已创建前端环境配置文件"
    fi
    
    log_success "环境配置文件创建完成"
}

# 构建和启动服务
start_services() {
    log_info "构建和启动服务..."
    
    # 停止现有服务
    docker-compose down
    
    # 构建镜像
    log_info "构建Docker镜像..."
    docker-compose build --no-cache
    
    # 启动服务
    log_info "启动服务..."
    docker-compose up -d
    
    log_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待数据库
    log_info "等待数据库启动..."
    timeout 60 bash -c 'until docker-compose exec -T postgres pg_isready -U iot_user -d iot_platform; do sleep 2; done'
    
    # 等待后端服务
    log_info "等待后端服务启动..."
    timeout 60 bash -c 'until curl -f http://localhost:8000/health; do sleep 2; done'
    
    # 等待前端服务
    log_info "等待前端服务启动..."
    timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'
    
    log_success "所有服务已就绪"
}

# 运行数据库迁移
run_migrations() {
    log_info "运行数据库迁移..."
    
    # 等待数据库完全启动
    sleep 10
    
    # 运行Prisma迁移
    docker-compose exec backend npx prisma migrate deploy
    
    # 生成Prisma客户端
    docker-compose exec backend npx prisma generate
    
    log_success "数据库迁移完成"
}

# 显示服务状态
show_status() {
    log_info "服务状态："
    docker-compose ps
    
    echo ""
    log_info "访问地址："
    echo "  前端: https://localhost"
    echo "  后端API: https://localhost/api"
    echo "  健康检查: https://localhost/health"
    echo ""
    log_info "默认管理员账户："
    echo "  用户名: admin"
    echo "  密码: admin123"
    echo ""
    log_warning "请在生产环境中修改默认密码！"
}

# 显示日志
show_logs() {
    log_info "显示服务日志..."
    docker-compose logs -f
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    docker-compose down
    log_success "服务已停止"
}

# 清理数据
clean_data() {
    log_warning "这将删除所有数据，包括数据库和上传的文件！"
    read -p "确定要继续吗？(y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理数据..."
        docker-compose down -v
        docker system prune -f
        rm -rf uploads/*
        log_success "数据清理完成"
    else
        log_info "取消清理操作"
    fi
}

# 备份数据
backup_data() {
    log_info "备份数据..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 备份数据库
    docker-compose exec -T postgres pg_dump -U iot_user iot_platform > "$BACKUP_DIR/database.sql"
    
    # 备份上传文件
    if [ -d "uploads" ]; then
        cp -r uploads "$BACKUP_DIR/"
    fi
    
    # 备份配置文件
    cp -r docker "$BACKUP_DIR/"
    cp -r nginx "$BACKUP_DIR/"
    
    log_success "数据备份完成: $BACKUP_DIR"
}

# 恢复数据
restore_data() {
    log_info "可用的备份："
    ls -la backups/ 2>/dev/null || {
        log_error "没有找到备份目录"
        exit 1
    }
    
    read -p "请输入要恢复的备份目录名: " backup_name
    
    if [ ! -d "backups/$backup_name" ]; then
        log_error "备份目录不存在: backups/$backup_name"
        exit 1
    fi
    
    log_warning "这将覆盖当前数据！"
    read -p "确定要继续吗？(y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "恢复数据..."
        
        # 停止服务
        docker-compose down
        
        # 恢复数据库
        docker-compose up -d postgres
        sleep 10
        docker-compose exec -T postgres psql -U iot_user -d iot_platform < "backups/$backup_name/database.sql"
        
        # 恢复文件
        if [ -d "backups/$backup_name/uploads" ]; then
            rm -rf uploads
            cp -r "backups/$backup_name/uploads" .
        fi
        
        # 启动所有服务
        docker-compose up -d
        
        log_success "数据恢复完成"
    else
        log_info "取消恢复操作"
    fi
}

# 主函数
main() {
    case "${1:-deploy}" in
        "deploy")
            log_info "开始部署IoT设备管理平台..."
            check_dependencies
            create_directories
            generate_ssl_cert
            create_env_files
            start_services
            wait_for_services
            run_migrations
            show_status
            log_success "部署完成！"
            ;;
        "start")
            log_info "启动服务..."
            docker-compose up -d
            wait_for_services
            show_status
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            log_info "重启服务..."
            docker-compose restart
            wait_for_services
            show_status
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_data
            ;;
        "restore")
            restore_data
            ;;
        "clean")
            clean_data
            ;;
        "update")
            log_info "更新服务..."
            docker-compose pull
            docker-compose up -d --build
            wait_for_services
            run_migrations
            show_status
            ;;
        *)
            echo "用法: $0 {deploy|start|stop|restart|logs|status|backup|restore|clean|update}"
            echo ""
            echo "命令说明："
            echo "  deploy   - 完整部署（默认）"
            echo "  start    - 启动服务"
            echo "  stop     - 停止服务"
            echo "  restart  - 重启服务"
            echo "  logs     - 查看日志"
            echo "  status   - 查看状态"
            echo "  backup   - 备份数据"
            echo "  restore  - 恢复数据"
            echo "  clean    - 清理数据"
            echo "  update   - 更新服务"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
