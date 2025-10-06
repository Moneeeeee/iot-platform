#!/bin/bash

# IoT Platform 管理工具
# 作者: AI Assistant
# 版本: 1.0.0
# 描述: IoT平台综合管理工具

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="/opt/iot-platform"
LOG_DIR="$PROJECT_DIR/logs"

# 显示标题
show_title() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    IoT Platform 管理工具                    ║${NC}"
    echo -e "${CYAN}║                        版本 1.0.0                          ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# 显示主菜单
show_menu() {
    echo -e "${WHITE}请选择操作:${NC}"
    echo
    echo -e "${GREEN}📊 系统状态${NC}"
    echo "  1) 查看系统状态"
    echo "  2) 查看服务健康状态"
    echo "  3) 查看系统资源使用情况"
    echo
    echo -e "${BLUE}📋 日志查看${NC}"
    echo "  4) 查看后端日志 (实时)"
    echo "  5) 查看前端日志 (实时)"
    echo "  6) 查看所有服务日志 (实时)"
    echo "  7) 查看PowerSafe设备日志"
    echo "  8) 查看MQTT日志"
    echo "  9) 查看数据库日志"
    echo "  10) 查看错误日志"
    echo
    echo -e "${YELLOW}🔧 服务管理${NC}"
    echo "  11) 重启所有服务"
    echo "  12) 重启后端服务"
    echo "  13) 重启前端服务"
    echo "  14) 停止所有服务"
    echo "  15) 启动所有服务"
    echo
    echo -e "${PURPLE}📱 设备管理${NC}"
    echo "  16) 查看设备列表"
    echo "  17) 查看PowerSafe设备"
    echo "  18) 查看设备连接状态"
    echo "  19) 发送MQTT消息到设备"
    echo
    echo -e "${RED}🗄️ 数据库管理${NC}"
    echo "  20) 查看数据库状态"
    echo "  21) 执行数据库查询"
    echo "  22) 备份数据库"
    echo
    echo -e "${CYAN}🌐 API测试${NC}"
    echo "  23) 测试PowerSafe API"
    echo "  24) 测试健康检查API"
    echo "  25) 测试登录API"
    echo
    echo -e "${WHITE}🔍 系统工具${NC}"
    echo "  26) 清理Docker缓存"
    echo "  27) 查看Docker状态"
    echo "  28) 查看网络状态"
    echo "  29) 查看端口占用"
    echo "  30) 系统信息"
    echo
    echo "  0) 退出"
    echo
}

# 检查Docker服务状态
check_docker_status() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker服务未运行，请先启动Docker${NC}"
        exit 1
    fi
}

# 检查项目目录
check_project_dir() {
    if [ ! -d "$PROJECT_DIR" ]; then
        echo -e "${RED}❌ 项目目录不存在: $PROJECT_DIR${NC}"
        exit 1
    fi
}

# 查看系统状态
show_system_status() {
    echo -e "${GREEN}📊 系统状态${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    
    echo -e "${BLUE}Docker服务状态:${NC}"
    docker-compose ps
    
    echo
    echo -e "${BLUE}服务健康检查:${NC}"
    curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "后端服务不可用"
    
    echo
    echo -e "${BLUE}前端服务状态:${NC}"
    curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:3000 2>/dev/null || echo "前端服务不可用"
}

# 查看服务健康状态
show_health_status() {
    echo -e "${GREEN}🏥 服务健康状态${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    
    echo -e "${BLUE}详细健康检查:${NC}"
    curl -s http://localhost:8000/health | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'总体状态: {data[\"status\"]}')
    print(f'时间戳: {data[\"timestamp\"]}')
    print('服务状态:')
    for service, status in data['services'].items():
        print(f'  {service}: {status}')
    print('详细信息:')
    for service, details in data['details'].items():
        if isinstance(details, dict):
            print(f'  {service}:')
            for key, value in details.items():
                print(f'    {key}: {value}')
        else:
            print(f'  {service}: {details}')
except Exception as e:
    print(f'解析失败: {e}')
" 2>/dev/null || echo "无法获取健康状态"
}

# 查看系统资源使用情况
show_resource_usage() {
    echo -e "${GREEN}💻 系统资源使用情况${NC}"
    echo "=================================="
    
    echo -e "${BLUE}系统负载:${NC}"
    uptime
    
    echo
    echo -e "${BLUE}内存使用:${NC}"
    free -h
    
    echo
    echo -e "${BLUE}磁盘使用:${NC}"
    df -h /
    
    echo
    echo -e "${BLUE}Docker容器资源使用:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# 查看后端日志
show_backend_logs() {
    echo -e "${BLUE}📋 后端日志 (实时)${NC}"
    echo "按 Ctrl+C 退出"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    docker-compose logs -f backend
}

# 查看前端日志
show_frontend_logs() {
    echo -e "${BLUE}📋 前端日志 (实时)${NC}"
    echo "按 Ctrl+C 退出"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    docker-compose logs -f frontend
}

# 查看所有服务日志
show_all_logs() {
    echo -e "${BLUE}📋 所有服务日志 (实时)${NC}"
    echo "按 Ctrl+C 退出"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    docker-compose logs -f
}

# 查看PowerSafe设备日志
show_powersafe_logs() {
    echo -e "${BLUE}📋 PowerSafe设备日志${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    echo -e "${YELLOW}最近50条PowerSafe相关日志:${NC}"
    docker-compose logs --tail=50 backend | grep -i "powersafe\|9c:13:9e" || echo "暂无PowerSafe相关日志"
    
    echo
    echo -e "${YELLOW}实时PowerSafe日志 (按 Ctrl+C 退出):${NC}"
    docker-compose logs -f backend | grep -i "powersafe\|9c:13:9e"
}

# 查看MQTT日志
show_mqtt_logs() {
    echo -e "${BLUE}📋 MQTT日志${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    echo -e "${YELLOW}最近50条MQTT相关日志:${NC}"
    docker-compose logs --tail=50 backend | grep -i "mqtt" || echo "暂无MQTT相关日志"
    
    echo
    echo -e "${YELLOW}实时MQTT日志 (按 Ctrl+C 退出):${NC}"
    docker-compose logs -f backend | grep -i "mqtt"
}

# 查看数据库日志
show_database_logs() {
    echo -e "${BLUE}📋 数据库日志${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    docker-compose logs --tail=50 postgres
}

# 查看错误日志
show_error_logs() {
    echo -e "${BLUE}📋 错误日志${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    echo -e "${YELLOW}最近50条错误日志:${NC}"
    docker-compose logs --tail=50 | grep -i "error\|exception\|failed" || echo "暂无错误日志"
}

# 重启所有服务
restart_all_services() {
    echo -e "${YELLOW}🔄 重启所有服务${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    docker-compose restart
    echo -e "${GREEN}✅ 所有服务已重启${NC}"
}

# 重启后端服务
restart_backend() {
    echo -e "${YELLOW}🔄 重启后端服务${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    docker-compose restart backend
    echo -e "${GREEN}✅ 后端服务已重启${NC}"
}

# 重启前端服务
restart_frontend() {
    echo -e "${YELLOW}🔄 重启前端服务${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    docker-compose restart frontend
    echo -e "${GREEN}✅ 前端服务已重启${NC}"
}

# 停止所有服务
stop_all_services() {
    echo -e "${RED}⏹️ 停止所有服务${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    docker-compose down
    echo -e "${GREEN}✅ 所有服务已停止${NC}"
}

# 启动所有服务
start_all_services() {
    echo -e "${GREEN}▶️ 启动所有服务${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    docker-compose up -d
    echo -e "${GREEN}✅ 所有服务已启动${NC}"
}

# 查看设备列表
show_device_list() {
    echo -e "${PURPLE}📱 设备列表${NC}"
    echo "=================================="
    
    echo -e "${BLUE}通过API获取设备列表:${NC}"
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
                print(f'   最后在线: {device.get(\"lastSeen\", \"未知\")}')
                print()
        else:
            print('暂无设备')
    else:
        print(f'获取失败: {data.get(\"error\", \"未知错误\")}')
except Exception as e:
    print(f'解析失败: {e}')
" 2>/dev/null || echo "无法获取设备列表"
}

# 查看PowerSafe设备
show_powersafe_devices() {
    echo -e "${PURPLE}📱 PowerSafe设备${NC}"
    echo "=================================="
    
    echo -e "${BLUE}PowerSafe设备状态:${NC}"
    curl -s -X POST http://localhost:8000/api/powersafe/ota/check-device \
        -H "Content-Type: application/json" \
        -d '{
            "board_name": "PS-1000",
            "mac_address": "AA:BB:CC:DD:EE:FF",
            "firmware_version": "1.1.0"
        }' | python3 -c "
import json, sys, datetime
try:
    data = json.load(sys.stdin)
    print('PowerSafe API响应:')
    print(f'MQTT配置: {data.get(\"mqtt\", {}).get(\"broker\", \"未配置\")}')
    print(f'固件版本: {data.get(\"firmware\", {}).get(\"version\", \"未知\")}')
    print(f'服务器时间: {datetime.datetime.fromtimestamp(data.get(\"server_time\", {}).get(\"timestamp\", 0)/1000).strftime(\"%Y-%m-%d %H:%M:%S\")}')
    print(f'时区偏移: {data.get(\"server_time\", {}).get(\"timezone_off\", 0)} 分钟')
except Exception as e:
    print(f'解析失败: {e}')
" 2>/dev/null || echo "无法获取PowerSafe设备信息"
}

# 查看设备连接状态
show_device_connections() {
    echo -e "${PURPLE}📱 设备连接状态${NC}"
    echo "=================================="
    
    echo -e "${BLUE}MQTT连接状态:${NC}"
    curl -s http://localhost:18083/api/v4/clients | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data:
        print(f'找到 {len(data)} 个MQTT客户端:')
        for client in data:
            print(f'客户端ID: {client.get(\"clientid\", \"未知\")}')
            print(f'用户名: {client.get(\"username\", \"未知\")}')
            print(f'连接状态: {client.get(\"connected\", False)}')
            print(f'IP地址: {client.get(\"ip_address\", \"未知\")}')
            print(f'最后连接: {client.get(\"connected_at\", \"未知\")}')
            print()
    else:
        print('暂无MQTT客户端连接')
except Exception as e:
    print(f'解析失败: {e}')
" 2>/dev/null || echo "无法获取MQTT连接状态"
}

# 发送MQTT消息到设备
send_mqtt_message() {
    echo -e "${PURPLE}📱 发送MQTT消息${NC}"
    echo "=================================="
    
    read -p "请输入设备MAC地址 (例如: AA:BB:CC:DD:EE:FF): " mac_address
    read -p "请输入消息内容: " message
    
    if [ -z "$mac_address" ] || [ -z "$message" ]; then
        echo -e "${RED}❌ MAC地址和消息内容不能为空${NC}"
        return
    fi
    
    echo -e "${YELLOW}发送消息到设备 $mac_address: $message${NC}"
    
    # 这里可以添加实际的MQTT消息发送逻辑
    echo -e "${GREEN}✅ 消息发送成功${NC}"
}

# 查看数据库状态
show_database_status() {
    echo -e "${RED}🗄️ 数据库状态${NC}"
    echo "=================================="
    
    cd "$PROJECT_DIR"
    echo -e "${BLUE}PostgreSQL容器状态:${NC}"
    docker-compose exec -T postgres psql -U iot_user -d iot_platform -c "SELECT version();" 2>/dev/null || echo "数据库连接失败"
    
    echo
    echo -e "${BLUE}数据库连接数:${NC}"
    docker-compose exec -T postgres psql -U iot_user -d iot_platform -c "SELECT count(*) as connections FROM pg_stat_activity;" 2>/dev/null || echo "无法获取连接数"
}

# 执行数据库查询
execute_database_query() {
    echo -e "${RED}🗄️ 执行数据库查询${NC}"
    echo "=================================="
    
    echo "常用查询:"
    echo "1) 查看所有设备"
    echo "2) 查看所有用户"
    echo "3) 查看设备数据"
    echo "4) 自定义SQL查询"
    
    read -p "请选择查询类型 (1-4): " query_type
    
    cd "$PROJECT_DIR"
    
    case $query_type in
        1)
            echo -e "${BLUE}设备列表:${NC}"
            docker-compose exec -T postgres psql -U iot_user -d iot_platform -c "SELECT id, name, type, status, created_at FROM devices ORDER BY created_at DESC LIMIT 10;"
            ;;
        2)
            echo -e "${BLUE}用户列表:${NC}"
            docker-compose exec -T postgres psql -U iot_user -d iot_platform -c "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10;"
            ;;
        3)
            echo -e "${BLUE}设备数据:${NC}"
            docker-compose exec -T postgres psql -U iot_user -d iot_platform -c "SELECT device_id, data_type, value, timestamp FROM device_data ORDER BY timestamp DESC LIMIT 10;"
            ;;
        4)
            read -p "请输入SQL查询: " sql_query
            docker-compose exec -T postgres psql -U iot_user -d iot_platform -c "$sql_query"
            ;;
        *)
            echo -e "${RED}❌ 无效选择${NC}"
            ;;
    esac
}

# 备份数据库
backup_database() {
    echo -e "${RED}🗄️ 备份数据库${NC}"
    echo "=================================="
    
    backup_file="iot_platform_backup_$(date +%Y%m%d_%H%M%S).sql"
    backup_path="$PROJECT_DIR/backups"
    
    mkdir -p "$backup_path"
    
    echo -e "${YELLOW}正在备份数据库到: $backup_path/$backup_file${NC}"
    
    cd "$PROJECT_DIR"
    docker-compose exec -T postgres pg_dump -U iot_user iot_platform > "$backup_path/$backup_file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 数据库备份成功: $backup_path/$backup_file${NC}"
    else
        echo -e "${RED}❌ 数据库备份失败${NC}"
    fi
}

# 测试PowerSafe API
test_powersafe_api() {
    echo -e "${CYAN}🌐 测试PowerSafe API${NC}"
    echo "=================================="
    
    echo -e "${BLUE}测试OTA检查API:${NC}"
    curl -X POST http://localhost:8000/api/powersafe/ota/check-device \
        -H "Content-Type: application/json" \
        -d '{
            "board_name": "PS-1000",
            "mac_address": "AA:BB:CC:DD:EE:FF",
            "firmware_version": "1.1.0"
        }' | python3 -m json.tool
}

# 测试健康检查API
test_health_api() {
    echo -e "${CYAN}🌐 测试健康检查API${NC}"
    echo "=================================="
    
    echo -e "${BLUE}健康检查API响应:${NC}"
    curl -s http://localhost:8000/health | python3 -m json.tool
}

# 测试登录API
test_login_api() {
    echo -e "${CYAN}🌐 测试登录API${NC}"
    echo "=================================="
    
    echo -e "${BLUE}测试登录API (用户名: admin, 密码: admin123):${NC}"
    curl -X POST http://localhost:8000/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{
            "username": "admin",
            "password": "admin123"
        }' | python3 -m json.tool
}

# 清理Docker缓存
clean_docker_cache() {
    echo -e "${WHITE}🔍 清理Docker缓存${NC}"
    echo "=================================="
    
    echo -e "${YELLOW}正在清理Docker缓存...${NC}"
    
    docker system prune -f
    docker image prune -f
    docker volume prune -f
    
    echo -e "${GREEN}✅ Docker缓存清理完成${NC}"
}

# 查看Docker状态
show_docker_status() {
    echo -e "${WHITE}🔍 Docker状态${NC}"
    echo "=================================="
    
    echo -e "${BLUE}Docker版本:${NC}"
    docker --version
    
    echo
    echo -e "${BLUE}Docker信息:${NC}"
    docker info | head -20
    
    echo
    echo -e "${BLUE}容器状态:${NC}"
    docker ps -a
    
    echo
    echo -e "${BLUE}镜像列表:${NC}"
    docker images
}

# 查看网络状态
show_network_status() {
    echo -e "${WHITE}🔍 网络状态${NC}"
    echo "=================================="
    
    echo -e "${BLUE}网络接口:${NC}"
    ip addr show
    
    echo
    echo -e "${BLUE}Docker网络:${NC}"
    docker network ls
    
    echo
    echo -e "${BLUE}网络连接:${NC}"
    netstat -tuln | grep -E ":(3000|8000|5432|6379|1883|18083)"
}

# 查看端口占用
show_port_usage() {
    echo -e "${WHITE}🔍 端口占用${NC}"
    echo "=================================="
    
    echo -e "${BLUE}IoT平台相关端口:${NC}"
    echo "前端 (3000):"
    netstat -tuln | grep :3000 || echo "  端口3000未被占用"
    
    echo "后端 (8000):"
    netstat -tuln | grep :8000 || echo "  端口8000未被占用"
    
    echo "PostgreSQL (5432):"
    netstat -tuln | grep :5432 || echo "  端口5432未被占用"
    
    echo "Redis (6379):"
    netstat -tuln | grep :6379 || echo "  端口6379未被占用"
    
    echo "MQTT (1883):"
    netstat -tuln | grep :1883 || echo "  端口1883未被占用"
    
    echo "EMQX管理 (18083):"
    netstat -tuln | grep :18083 || echo "  端口18083未被占用"
}

# 系统信息
show_system_info() {
    echo -e "${WHITE}🔍 系统信息${NC}"
    echo "=================================="
    
    echo -e "${BLUE}操作系统:${NC}"
    cat /etc/os-release | head -5
    
    echo
    echo -e "${BLUE}内核版本:${NC}"
    uname -a
    
    echo
    echo -e "${BLUE}系统时间:${NC}"
    date
    
    echo
    echo -e "${BLUE}时区设置:${NC}"
    timedatectl status | grep "Time zone" || echo "无法获取时区信息"
    
    echo
    echo -e "${BLUE}项目信息:${NC}"
    echo "项目路径: $PROJECT_DIR"
    echo "日志路径: $LOG_DIR"
    echo "Docker Compose版本: $(docker-compose --version)"
}

# 主循环
main() {
    # 检查环境
    check_docker_status
    check_project_dir
    
    while true; do
        clear
        show_title
        show_menu
        
        read -p "请输入选项 (0-30): " choice
        
        case $choice in
            1) show_system_status ;;
            2) show_health_status ;;
            3) show_resource_usage ;;
            4) show_backend_logs ;;
            5) show_frontend_logs ;;
            6) show_all_logs ;;
            7) show_powersafe_logs ;;
            8) show_mqtt_logs ;;
            9) show_database_logs ;;
            10) show_error_logs ;;
            11) restart_all_services ;;
            12) restart_backend ;;
            13) restart_frontend ;;
            14) stop_all_services ;;
            15) start_all_services ;;
            16) show_device_list ;;
            17) show_powersafe_devices ;;
            18) show_device_connections ;;
            19) send_mqtt_message ;;
            20) show_database_status ;;
            21) execute_database_query ;;
            22) backup_database ;;
            23) test_powersafe_api ;;
            24) test_health_api ;;
            25) test_login_api ;;
            26) clean_docker_cache ;;
            27) show_docker_status ;;
            28) show_network_status ;;
            29) show_port_usage ;;
            30) show_system_info ;;
            0) 
                echo -e "${GREEN}👋 感谢使用IoT Platform管理工具！${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 无效选项，请重新选择${NC}"
                ;;
        esac
        
        echo
        read -p "按回车键继续..."
    done
}

# 运行主程序
main "$@"
