#!/bin/bash

# IoT Platform 命令别名
# 使用方法: source /opt/iot-platform/aliases.sh

# 项目路径
export IOT_PROJECT_DIR="/opt/iot-platform"

# 快速导航
alias iot='cd /opt/iot-platform'
alias iotlogs='cd /opt/iot-platform && docker-compose logs -f'
alias iotstatus='cd /opt/iot-platform && docker-compose ps'

# 日志查看
alias iot-backend='cd /opt/iot-platform && docker-compose logs -f backend'
alias iot-frontend='cd /opt/iot-platform && docker-compose logs -f frontend'
alias iot-powersafe='cd /opt/iot-platform && docker-compose logs -f backend | grep -i "powersafe\|9c:13:9e"'
alias iot-mqtt='cd /opt/iot-platform && docker-compose logs -f backend | grep -i mqtt'
alias iot-errors='cd /opt/iot-platform && docker-compose logs --tail=50 | grep -i "error\|exception\|failed"'

# 服务管理
alias iot-restart='cd /opt/iot-platform && docker-compose restart'
alias iot-restart-backend='cd /opt/iot-platform && docker-compose restart backend'
alias iot-restart-frontend='cd /opt/iot-platform && docker-compose restart frontend'
alias iot-stop='cd /opt/iot-platform && docker-compose down'
alias iot-start='cd /opt/iot-platform && docker-compose up -d'

# 状态检查
alias iot-health='curl -s http://localhost:8000/health | python3 -m json.tool'
alias iot-ps='cd /opt/iot-platform && docker-compose ps'
alias iot-stats='docker stats --no-stream'

# API测试
alias iot-test-login='curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" | python3 -m json.tool'

# 数据库操作
alias iot-db='cd /opt/iot-platform && docker-compose exec postgres psql -U iot_user -d iot_platform'
alias iot-db-devices='cd /opt/iot-platform && docker-compose exec postgres psql -U iot_user -d iot_platform -c "SELECT id, name, type, status FROM devices LIMIT 10;"'

# 工具启动
alias iot-cli='cd /opt/iot-platform && ./scripts/iot-cli.sh'
alias iot-help='cd /opt/iot-platform && ./scripts/iot-cli.sh help'

# 显示可用别名
iot-aliases() {
    echo "IoT Platform 命令别名:"
    echo "======================"
    echo
    echo "导航:"
    echo "  iot              - 进入项目目录"
    echo "  iotlogs          - 查看所有日志"
    echo "  iotstatus        - 查看服务状态"
    echo
    echo "日志查看:"
    echo "  iot-backend      - 后端日志"
    echo "  iot-frontend     - 前端日志"
    echo "  iot-powersafe    - PowerSafe设备日志"
    echo "  iot-mqtt         - MQTT日志"
    echo "  iot-errors       - 错误日志"
    echo
    echo "服务管理:"
    echo "  iot-restart      - 重启所有服务"
    echo "  iot-restart-backend  - 重启后端"
    echo "  iot-restart-frontend - 重启前端"
    echo "  iot-stop         - 停止所有服务"
    echo "  iot-start        - 启动所有服务"
    echo
    echo "状态检查:"
    echo "  iot-health       - 健康检查"
    echo "  iot-ps           - 服务状态"
    echo "  iot-stats        - 资源使用"
    echo
    echo "API测试:"
    echo "  iot-test-powersafe - 测试PowerSafe API"
    echo "  iot-test-login   - 测试登录API"
    echo
    echo "数据库:"
    echo "  iot-db           - 连接数据库"
    echo "  iot-db-devices   - 查看设备列表"
    echo
    echo "工具:"
    echo "  iot-cli          - 启动现代化CLI工具"
    echo "  iot-help         - 显示CLI帮助"
    echo "  iot-aliases      - 显示此别名列表"
}

echo "IoT Platform 别名已加载!"
echo "输入 'iot-aliases' 查看所有可用命令"
