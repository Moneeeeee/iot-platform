#!/bin/bash

# IoT Platform 现代化CLI工具
# 版本: 2.0.0
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
NC='\033[0m'

# 项目路径
PROJECT_DIR="/opt/iot-platform"
SCRIPT_DIR="$PROJECT_DIR/scripts"

# 辅助函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示帮助信息
show_help() {
    echo -e "${CYAN}IoT Platform CLI 工具 v2.0.0${NC}"
    echo "=================================="
    echo
    echo -e "${WHITE}用法:${NC}"
    echo "  ./scripts/iot-cli.sh [命令] [选项]"
    echo
    echo -e "${GREEN}📊 系统管理${NC}"
    echo "  status              - 查看系统状态"
    echo "  health              - 健康检查"
    echo "  resources           - 系统资源使用"
    echo "  ps                  - 服务状态"
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
    echo "  powersafe           - PowerSafe设备状态"
    echo "  mqtt-clients        - MQTT客户端连接"
    echo
    echo -e "${RED}🗄️ 数据库管理${NC}"
    echo "  db                  - 连接数据库"
    echo "  db-backup           - 备份数据库"
    echo "  db-query <SQL>      - 执行SQL查询"
    echo
    echo -e "${CYAN}🌐 API测试${NC}"
    echo "  test-health         - 测试健康检查API"
    echo "  test-powersafe      - 测试PowerSafe API"
    echo "  test-login          - 测试登录API"
    echo
    echo -e "${WHITE}🔍 系统工具${NC}"
    echo "  clean               - 清理Docker缓存"
    echo "  ports               - 查看端口占用"
    echo "  network             - 网络状态"
    echo "  info                - 系统信息"
    echo
    echo -e "${GREEN}示例:${NC}"
    echo "  ./scripts/iot-cli.sh status"
    echo "  ./scripts/iot-cli.sh logs tail backend"
    echo "  ./scripts/iot-cli.sh restart backend"
    echo "  ./scripts/iot-cli.sh logs search 'error'"
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

# 系统状态
show_status() {
    echo -e "${GREEN}📊 系统状态${NC}"
    echo "=================================="
    docker-compose ps
    echo
    echo -e "${BLUE}健康检查:${NC}"
    curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "后端服务不可用"
}

# 健康检查
show_health() {
    echo -e "${GREEN}🏥 健康检查${NC}"
    echo "=================================="
    curl -s http://localhost:8000/health | python3 -c "
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
" 2>/dev/null || echo "无法获取健康状态"
}

# 系统资源
show_resources() {
    echo -e "${GREEN}💻 系统资源${NC}"
    echo "=================================="
    echo -e "${BLUE}系统负载:${NC}"
    uptime
    echo
    echo -e "${BLUE}内存使用:${NC}"
    free -h
    echo
    echo -e "${BLUE}Docker容器资源:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
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

# PowerSafe设备
show_powersafe() {
    echo -e "${PURPLE}📱 PowerSafe设备${NC}"
    echo "=================================="
    curl -s -X POST http://localhost:8000/api/powersafe/ota/check-device \
        -H "Content-Type: application/json" \
        -d '{
            "board_name": "PS-1000",
            "mac_address": "AA:BB:CC:DD:EE:FF",
            "firmware_version": "1.1.0"
        }' | python3 -m json.tool 2>/dev/null || echo "无法获取PowerSafe设备信息"
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
        "powersafe")
            echo -e "${CYAN}🌐 测试PowerSafe API${NC}"
            curl -X POST http://localhost:8000/api/powersafe/ota/check-device \
                -H "Content-Type: application/json" \
                -d '{
                    "board_name": "PS-1000",
                    "mac_address": "AA:BB:CC:DD:EE:FF",
                    "firmware_version": "1.1.0"
                }' | python3 -m json.tool
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
            echo "可用类型: health, powersafe, login"
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
        "health")
            show_health
            ;;
        "resources")
            show_resources
            ;;
        "ps")
            show_ps
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
        "powersafe")
            show_powersafe
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
        "test-powersafe")
            test_api "powersafe"
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

# 运行主函数
main "$@"
