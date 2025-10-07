#!/bin/bash

# IoT Platform 现代化CLI工具
# 版本: 2.1.0
# 描述: 统一的IoT平台管理命令行工具

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
BOLD='\033[1m'
NC='\033[0m'

# 项目路径
PROJECT_DIR="/opt/iot-platform"
SCRIPT_DIR="$PROJECT_DIR/scripts"

# 配置
API_TIMEOUT=5
REFRESH_INTERVAL=2

# 辅助函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# 状态指示器
status_ok() { echo -e "${GREEN}✓${NC}"; }
status_error() { echo -e "${RED}✗${NC}"; }
status_warning() { echo -e "${YELLOW}⚠${NC}"; }
status_info() { echo -e "${BLUE}ℹ${NC}"; }

# 显示帮助信息
show_help() {
    echo -e "${CYAN}IoT Platform CLI 工具 v2.1.0${NC}"
    echo "=================================="
    echo
    echo -e "${WHITE}用法:${NC}"
    echo "  ./scripts/iot-cli.sh [命令] [选项]"
    echo
    echo -e "${GREEN}📊 系统管理${NC}"
    echo "  status              - 查看系统状态"
    echo "  dashboard           - 实时仪表板 (按q退出)"
    echo "  quick|q             - 快速状态检查"
    echo "  health              - 健康检查"
    echo "  resources           - 系统资源使用"
    echo "  ps                  - 服务状态"
    echo "  watch               - 实时监控服务状态"
    echo
    echo -e "${BLUE}📋 日志管理${NC}"
    echo "  logs [服务]         - 查看日志 (使用Docker原生命令)"
    echo "  logs tail [服务]    - 实时日志"
    echo "  logs search <关键词> - 搜索日志"
    echo
    echo -e "${YELLOW}🔧 服务管理${NC}"
    echo "  start [服务]        - 启动服务"
    echo "  stop [服务]         - 停止服务"
    echo "  restart [服务]      - 重启服务"
    echo "  up                  - 启动所有服务"
    echo "  down                - 停止所有服务"
    echo
    echo -e "${PURPLE}📱 设备管理${NC}"
    echo "  devices             - 查看设备列表"
    echo "  mqtt-clients        - MQTT客户端连接"
    echo
    echo -e "${RED}🗄️ 数据库管理${NC}"
    echo "  db                  - 连接数据库"
    echo "  db-backup           - 备份数据库"
    echo "  db-query <SQL>      - 执行SQL查询"
    echo
    echo -e "${CYAN}🌐 API测试${NC}"
    echo "  test-health         - 测试健康检查API"
    echo "  test-login          - 测试登录API"
    echo
    echo -e "${WHITE}🔍 系统工具${NC}"
    echo "  clean               - 清理Docker缓存"
    echo "  ports               - 查看端口占用"
    echo "  network             - 网络状态"
    echo "  info                - 系统信息"
    echo
    echo -e "${GREEN}示例:${NC}"
    echo "  ./scripts/iot-cli.sh q                # 快速状态检查"
    echo "  ./scripts/iot-cli.sh status          # 详细系统状态"
    echo "  ./scripts/iot-cli.sh dashboard       # 实时仪表板"
    echo "  ./scripts/iot-cli.sh watch           # 实时监控"
    echo "  ./scripts/iot-cli.sh logs tail backend"
    echo "  ./scripts/iot-cli.sh restart backend"
    echo "  ./scripts/iot-cli.sh logs search 'error'"
    echo
    echo -e "${YELLOW}💡 提示:${NC}"
    echo "  - 使用 'q' 或 'quick' 命令进行快速状态检查"
    echo "  - 使用 'dashboard' 命令获得最佳的状态查看体验"
    echo "  - 使用 'watch' 命令进行简单的服务状态监控"
    echo "  - 所有命令都支持超时和错误处理"
    echo
}

# 检查环境
check_environment() {
    if [ ! -d "$PROJECT_DIR" ]; then
        echo -e "${RED}❌ 项目目录不存在: $PROJECT_DIR${NC}"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker服务未运行${NC}"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
}

# 检查服务状态
check_service_status() {
    local service="$1"
    if docker-compose ps "$service" 2>/dev/null | grep -q "Up"; then
        return 0
    else
        return 1
    fi
}

# 获取服务状态图标
get_service_status_icon() {
    local service="$1"
    if check_service_status "$service"; then
        status_ok
    else
        status_error
    fi
}

# 系统状态
show_status() {
    echo -e "${GREEN}📊 系统状态${NC}"
    echo "=================================="
    
    # 服务状态概览
    echo -e "${BOLD}服务状态概览:${NC}"
    local services=("backend" "frontend" "postgres" "redis" "emqx")
    for service in "${services[@]}"; do
        local status_icon=$(get_service_status_icon "$service")
        printf "  %-12s %s\n" "$service:" "$status_icon"
    done
    echo
    
    # 详细状态
    echo -e "${BOLD}详细状态:${NC}"
    docker-compose ps
    echo
    
    # 健康检查
    echo -e "${BOLD}健康检查:${NC}"
    local health_response=$(curl -s --max-time $API_TIMEOUT http://localhost:8000/health 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$health_response" ]; then
        echo "$health_response" | python3 -m json.tool 2>/dev/null || echo "$health_response"
    else
        echo -e "${RED}后端服务不可用${NC}"
    fi
}

# 实时仪表板
show_dashboard() {
    echo -e "${CYAN}📊 IoT Platform 实时仪表板${NC}"
    echo "=================================="
    echo -e "${GRAY}按 'q' 退出监控${NC}"
    echo
    
    while true; do
        # 清屏
        clear
        
        # 标题
        echo -e "${CYAN}📊 IoT Platform 实时仪表板${NC} - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=================================="
        
        # 服务状态
        echo -e "${BOLD}🔧 服务状态:${NC}"
        local services=("backend" "frontend" "postgres" "redis" "emqx")
        for service in "${services[@]}"; do
            local status_icon=$(get_service_status_icon "$service")
            printf "  %-12s %s\n" "$service:" "$status_icon"
        done
        echo
        
        # 系统资源
        echo -e "${BOLD}💻 系统资源:${NC}"
        echo -e "  负载: $(uptime | awk -F'load average:' '{print $2}')"
        echo -e "  内存: $(free -h | awk 'NR==2{printf "%.1f%%", $3/$2*100}')"
        echo -e "  磁盘: $(df -h / | awk 'NR==2{print $5}')"
        echo
        
        # 容器资源
        echo -e "${BOLD}🐳 容器资源:${NC}"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | head -6
        echo
        
        # 网络状态
        echo -e "${BOLD}🌐 网络状态:${NC}"
        local ports=("3000:Frontend" "8000:Backend" "5432:PostgreSQL" "6379:Redis" "1883:MQTT" "18083:EMQX")
        for port_info in "${ports[@]}"; do
            local port=$(echo "$port_info" | cut -d: -f1)
            local service_name=$(echo "$port_info" | cut -d: -f2)
            if netstat -tuln 2>/dev/null | grep -q ":$port "; then
                printf "  %-12s %s\n" "$service_name:" "$(status_ok)"
            else
                printf "  %-12s %s\n" "$service_name:" "$(status_error)"
            fi
        done
        echo
        
        # 设备统计
        echo -e "${BOLD}📱 设备统计:${NC}"
        local device_count=$(curl -s --max-time $API_TIMEOUT http://localhost:8000/api/devices 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print(len(data.get('data', [])))
    else:
        print('0')
except:
    print('0')
" 2>/dev/null || echo "0")
        echo -e "  在线设备: $device_count"
        echo
        
        # 等待用户输入
        echo -e "${GRAY}刷新间隔: ${REFRESH_INTERVAL}秒 | 按 'q' 退出${NC}"
        
        # 非阻塞读取
        read -t $REFRESH_INTERVAL -n 1 key 2>/dev/null
        if [[ "$key" == "q" ]]; then
            break
        fi
    done
    
    echo -e "\n${GREEN}退出仪表板${NC}"
}

# 健康检查
show_health() {
    echo -e "${GREEN}🏥 健康检查${NC}"
    echo "=================================="
    
    local health_response=$(curl -s --max-time $API_TIMEOUT http://localhost:8000/health 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$health_response" ]; then
        echo "$health_response" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'总体状态: {data[\"status\"]}')
    print(f'时间戳: {data[\"timestamp\"]}')
    print('服务状态:')
    for service, status in data['services'].items():
        print(f'  {service}: {status}')
except Exception as e:
    print(f'解析失败: {e}')
" 2>/dev/null || echo "$health_response"
    else
        echo -e "${RED}无法获取健康状态${NC}"
    fi
}

# 实时监控
show_watch() {
    echo -e "${CYAN}👀 实时监控服务状态${NC}"
    echo "=================================="
    echo -e "${GRAY}按 Ctrl+C 退出监控${NC}"
    echo
    
    while true; do
        clear
        echo -e "${CYAN}👀 实时监控服务状态${NC} - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=================================="
        
        # 服务状态
        echo -e "${BOLD}🔧 服务状态:${NC}"
        local services=("backend" "frontend" "postgres" "redis" "emqx")
        for service in "${services[@]}"; do
            local status_icon=$(get_service_status_icon "$service")
            printf "  %-12s %s\n" "$service:" "$status_icon"
        done
        echo
        
        # 容器状态
        echo -e "${BOLD}🐳 容器状态:${NC}"
        docker-compose ps
        echo
        
        # 等待
        sleep $REFRESH_INTERVAL
    done
}

# 系统资源
show_resources() {
    echo -e "${GREEN}💻 系统资源${NC}"
    echo "=================================="
    
    # 系统概览
    echo -e "${BOLD}系统概览:${NC}"
    echo -e "  负载: $(uptime | awk -F'load average:' '{print $2}')"
    echo -e "  运行时间: $(uptime | awk '{print $3,$4}' | sed 's/,//')"
    echo
    
    # 内存使用
    echo -e "${BOLD}内存使用:${NC}"
    free -h | awk 'NR==1{printf "%-10s %10s %10s %10s %10s\n", $1, $2, $3, $4, $5}'
    free -h | awk 'NR==2{printf "%-10s %10s %10s %10s %10s\n", $1, $2, $3, $4, $5}'
    echo
    
    # 磁盘使用
    echo -e "${BOLD}磁盘使用:${NC}"
    df -h / | awk 'NR==1{printf "%-10s %10s %10s %10s %10s %s\n", $1, $2, $3, $4, $5, $6}'
    df -h / | awk 'NR==2{printf "%-10s %10s %10s %10s %10s %s\n", $1, $2, $3, $4, $5, $6}'
    echo
    
    # Docker容器资源
    echo -e "${BOLD}Docker容器资源:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null || echo "无法获取容器资源信息"
}

# 服务状态
show_ps() {
    echo -e "${GREEN}📋 服务状态${NC}"
    echo "=================================="
    docker-compose ps
}

# 日志管理 (使用Docker原生命令)
handle_logs() {
    local subcommand="$1"
    shift
    
    case "$subcommand" in
        "tail")
            if [ -n "$1" ]; then
                log_info "实时查看 $1 服务日志..."
                docker-compose logs -f "$1"
            else
                log_info "实时查看所有服务日志..."
                docker-compose logs -f
            fi
            ;;
        "search")
            if [ -n "$1" ]; then
                log_info "搜索包含 '$1' 的日志..."
                docker-compose logs | grep -i "$1"
            else
                log_error "请提供搜索关键词"
                echo "用法: ./scripts/iot-cli.sh logs search <关键词>"
            fi
            ;;
        *)
            if [ -n "$subcommand" ]; then
                log_info "查看 $subcommand 服务日志..."
                docker-compose logs --tail=100 "$subcommand"
            else
                log_info "查看所有服务日志..."
                docker-compose logs --tail=100
            fi
            ;;
    esac
}

# 服务管理
handle_services() {
    local action="$1"
    local service="$2"
    
    case "$action" in
        "start")
            if [ -n "$service" ]; then
                echo -e "${GREEN}▶️ 启动服务: $service${NC}"
                docker-compose start "$service"
            else
                echo -e "${GREEN}▶️ 启动所有服务${NC}"
                docker-compose up -d
            fi
            ;;
        "stop")
            if [ -n "$service" ]; then
                echo -e "${RED}⏹️ 停止服务: $service${NC}"
                docker-compose stop "$service"
            else
                echo -e "${RED}⏹️ 停止所有服务${NC}"
                docker-compose down
            fi
            ;;
        "restart")
            if [ -n "$service" ]; then
                echo -e "${YELLOW}🔄 重启服务: $service${NC}"
                docker-compose restart "$service"
            else
                echo -e "${YELLOW}🔄 重启所有服务${NC}"
                docker-compose restart
            fi
            ;;
        "up")
            echo -e "${GREEN}▶️ 启动所有服务${NC}"
            docker-compose up -d
            ;;
        "down")
            echo -e "${RED}⏹️ 停止所有服务${NC}"
            docker-compose down
            ;;
        *)
            echo -e "${RED}❌ 无效的服务操作: $action${NC}"
            echo "可用操作: start, stop, restart, up, down"
            exit 1
            ;;
    esac
}

# 设备管理
show_devices() {
    echo -e "${PURPLE}📱 设备列表${NC}"
    echo "=================================="
    curl -s http://localhost:8000/api/devices | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        devices = data.get('data', [])
        if devices:
            print(f'找到 {len(devices)} 个设备:')
            for i, device in enumerate(devices, 1):
                print(f'{i}. {device.get(\"name\", \"未知设备\")} ({device.get(\"type\", \"未知类型\")})')
                print(f'   ID: {device.get(\"id\")}')
                print(f'   状态: {device.get(\"status\", \"未知\")}')
                print()
        else:
            print('暂无设备')
    else:
        print(f'获取失败: {data.get(\"error\", \"未知错误\")}')
except Exception as e:
    print(f'解析失败: {e}')
" 2>/dev/null || echo "无法获取设备列表"
}


# MQTT客户端
show_mqtt_clients() {
    echo -e "${PURPLE}📱 MQTT客户端连接${NC}"
    echo "=================================="
    curl -s http://localhost:18083/api/v4/clients | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data:
        print(f'找到 {len(data)} 个MQTT客户端:')
        for client in data:
            print(f'客户端ID: {client.get(\"clientid\", \"未知\")}')
            print(f'连接状态: {client.get(\"connected\", False)}')
            print(f'IP地址: {client.get(\"ip_address\", \"未知\")}')
            print()
    else:
        print('暂无MQTT客户端连接')
except Exception as e:
    print(f'解析失败: {e}')
" 2>/dev/null || echo "无法获取MQTT连接状态"
}

# 数据库管理
handle_database() {
    local action="$1"
    shift
    
    case "$action" in
        "backup")
            local backup_file="iot_platform_backup_$(date +%Y%m%d_%H%M%S).sql"
            local backup_path="$PROJECT_DIR/backups"
            mkdir -p "$backup_path"
            echo -e "${YELLOW}正在备份数据库到: $backup_path/$backup_file${NC}"
            docker-compose exec -T postgres pg_dump -U iot_user iot_platform > "$backup_path/$backup_file"
            echo -e "${GREEN}✅ 数据库备份完成${NC}"
            ;;
        "query")
            if [ -n "$1" ]; then
                docker-compose exec -T postgres psql -U iot_user -d iot_platform -c "$1"
            else
                echo -e "${RED}❌ 请提供SQL查询语句${NC}"
            fi
            ;;
        *)
            echo -e "${BLUE}🗄️ 连接数据库${NC}"
            docker-compose exec postgres psql -U iot_user -d iot_platform
            ;;
    esac
}

# API测试
test_api() {
    local api_type="$1"
    
    case "$api_type" in
        "health")
            echo -e "${CYAN}🌐 测试健康检查API${NC}"
            curl -s http://localhost:8000/health | python3 -m json.tool
            ;;
        "login")
            echo -e "${CYAN}🌐 测试登录API${NC}"
            curl -X POST http://localhost:8000/api/auth/login \
                -H "Content-Type: application/json" \
                -d '{
                    "username": "admin",
                    "password": "admin123"
                }' | python3 -m json.tool
            ;;
        *)
            echo -e "${RED}❌ 无效的API类型: $api_type${NC}"
            echo "可用类型: health, login"
            exit 1
            ;;
    esac
}

# 系统工具
handle_tools() {
    local tool="$1"
    
    case "$tool" in
        "clean")
            echo -e "${YELLOW}🧹 清理Docker缓存${NC}"
            docker system prune -f
            docker image prune -f
            docker volume prune -f
            echo -e "${GREEN}✅ 清理完成${NC}"
            ;;
        "ports")
            echo -e "${BLUE}🔍 端口占用${NC}"
            echo "IoT平台相关端口:"
            netstat -tuln | grep -E ":(3000|8000|5432|6379|1883|18083)" || echo "相关端口未被占用"
            ;;
        "network")
            echo -e "${BLUE}🔍 网络状态${NC}"
            echo "Docker网络:"
            docker network ls
            echo
            echo "网络连接:"
            netstat -tuln | grep -E ":(3000|8000|5432|6379|1883|18083)"
            ;;
        "info")
            echo -e "${BLUE}🔍 系统信息${NC}"
            echo "操作系统:"
            cat /etc/os-release | head -5
            echo
            echo "内核版本:"
            uname -a
            echo
            echo "Docker版本:"
            docker --version
            echo
            echo "项目路径: $PROJECT_DIR"
            ;;
        *)
            echo -e "${RED}❌ 无效的工具: $tool${NC}"
            echo "可用工具: clean, ports, network, info"
            exit 1
            ;;
    esac
}

# 主函数
main() {
    check_environment
    
    local command="$1"
    shift
    
    case "$command" in
        "status")
            show_status
            ;;
        "dashboard")
            show_dashboard
            ;;
        "health")
            show_health
            ;;
        "resources")
            show_resources
            ;;
        "ps")
            show_ps
            ;;
        "watch")
            show_watch
            ;;
        "quick"|"q")
            quick_status
            ;;
        "logs")
            handle_logs "$@"
            ;;
        "start"|"stop"|"restart"|"up"|"down")
            handle_services "$command" "$@"
            ;;
        "devices")
            show_devices
            ;;
        "mqtt-clients")
            show_mqtt_clients
            ;;
        "db")
            handle_database "$@"
            ;;
        "db-backup")
            handle_database "backup"
            ;;
        "db-query")
            handle_database "query" "$@"
            ;;
        "test-health")
            test_api "health"
            ;;
        "test-login")
            test_api "login"
            ;;
        "clean")
            handle_tools "clean"
            ;;
        "ports")
            handle_tools "ports"
            ;;
        "network")
            handle_tools "network"
            ;;
        "info")
            handle_tools "info"
            ;;
        "help"|"-h"|"--help"|"")
            show_help
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $command${NC}"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 快速状态检查
quick_status() {
    echo -e "${BOLD}🔧 IoT Platform 快速状态${NC}"
    echo "================================"
    
    local services=("backend" "frontend" "postgres" "redis" "emqx")
    local all_ok=true
    
    for service in "${services[@]}"; do
        if check_service_status "$service"; then
            printf "  %-12s %s\n" "$service:" "$(status_ok)"
        else
            printf "  %-12s %s\n" "$service:" "$(status_error)"
            all_ok=false
        fi
    done
    
    echo
    if $all_ok; then
        echo -e "${GREEN}✅ 所有服务运行正常${NC}"
    else
        echo -e "${RED}❌ 部分服务异常${NC}"
        echo -e "${YELLOW}💡 使用 'dashboard' 命令查看详细信息${NC}"
    fi
}

# 运行主函数
main "$@"