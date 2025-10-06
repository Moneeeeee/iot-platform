#!/bin/bash

# IoT Platform 快速命令工具
# 提供常用的快速命令别名

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 项目路径
PROJECT_DIR="/opt/iot-platform"

# 快速命令函数
quick_logs() {
    echo -e "${BLUE}📋 快速日志查看${NC}"
    echo "=================================="
    echo "1) 后端日志: docker-compose logs -f backend"
    echo "2) 前端日志: docker-compose logs -f frontend"
    echo "3) PowerSafe日志: docker-compose logs -f backend | grep -i powersafe"
    echo "4) MQTT日志: docker-compose logs -f backend | grep -i mqtt"
    echo "5) 错误日志: docker-compose logs --tail=50 | grep -i error"
    echo
}

quick_status() {
    echo -e "${GREEN}📊 快速状态查看${NC}"
    echo "=================================="
    echo "1) 服务状态: docker-compose ps"
    echo "2) 健康检查: curl -s http://localhost:8000/health | python3 -m json.tool"
    echo "3) 系统资源: docker stats --no-stream"
    echo "4) 端口占用: netstat -tuln | grep -E ':(3000|8000|5432|6379|1883)'"
    echo
}

quick_restart() {
    echo -e "${YELLOW}🔄 快速重启命令${NC}"
    echo "=================================="
    echo "1) 重启所有: docker-compose restart"
    echo "2) 重启后端: docker-compose restart backend"
    echo "3) 重启前端: docker-compose restart frontend"
    echo "4) 完全重启: docker-compose down && docker-compose up -d"
    echo
}

quick_test() {
    echo -e "${BLUE}🌐 快速API测试${NC}"
    echo "=================================="
    echo "1) 健康检查: curl -s http://localhost:8000/health"
    echo "2) PowerSafe API: curl -X POST http://localhost:8000/api/powersafe/ota/check-device -H 'Content-Type: application/json' -d '{\"board_name\":\"PS-1000\",\"mac_address\":\"AA:BB:CC:DD:EE:FF\",\"firmware_version\":\"1.1.0\"}'"
    echo "3) 登录测试: curl -X POST http://localhost:8000/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
    echo
}

# 显示帮助信息
show_help() {
    echo -e "${GREEN}IoT Platform 快速命令工具${NC}"
    echo "=================================="
    echo
    echo "使用方法:"
    echo "  ./quick-commands.sh [命令]"
    echo
    echo "可用命令:"
    echo "  logs     - 显示日志查看命令"
    echo "  status   - 显示状态查看命令"
    echo "  restart  - 显示重启命令"
    echo "  test     - 显示API测试命令"
    echo "  help     - 显示此帮助信息"
    echo
    echo "示例:"
    echo "  ./quick-commands.sh logs"
    echo "  ./quick-commands.sh status"
    echo
}

# 主函数
main() {
    cd "$PROJECT_DIR"
    
    case "${1:-help}" in
        logs)
            quick_logs
            ;;
        status)
            quick_status
            ;;
        restart)
            quick_restart
            ;;
        test)
            quick_test
            ;;
        help|*)
            show_help
            ;;
    esac
}

# 运行主函数
main "$@"
