#!/bin/bash

# IoT Platform 交互式终端
# 版本: 1.0.0
# 描述: 交互式IoT平台管理终端

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
BRIGHT_RED='\033[1;31m'
BRIGHT_GREEN='\033[1;32m'
BRIGHT_YELLOW='\033[1;33m'
BRIGHT_BLUE='\033[1;34m'
BRIGHT_PURPLE='\033[1;35m'
BRIGHT_CYAN='\033[1;36m'
BRIGHT_WHITE='\033[1;37m'
DIM='\033[2m'
UNDERLINE='\033[4m'
BLINK='\033[5m'
REVERSE='\033[7m'
NC='\033[0m'

# 背景颜色
BG_RED='\033[41m'
BG_GREEN='\033[42m'
BG_YELLOW='\033[43m'
BG_BLUE='\033[44m'
BG_PURPLE='\033[45m'
BG_CYAN='\033[46m'
BG_WHITE='\033[47m'

# 项目路径
PROJECT_DIR="/opt/iot-platform"
SCRIPT_DIR="$PROJECT_DIR/scripts"

# 辅助函数
log_info() { echo -e "${BRIGHT_BLUE}ℹ️  [INFO]${NC} $1"; }
log_warning() { echo -e "${BRIGHT_YELLOW}⚠️  [WARNING]${NC} $1"; }
log_error() { echo -e "${BRIGHT_RED}❌ [ERROR]${NC} $1"; }
log_success() { echo -e "${BRIGHT_GREEN}✅ [SUCCESS]${NC} $1"; }
log_executing() { echo -e "${BRIGHT_CYAN}🚀 [EXECUTING]${NC} $1"; }

# 状态指示器
status_ok() { echo -e "${BRIGHT_GREEN}✅${NC}"; }
status_error() { echo -e "${BRIGHT_RED}❌${NC}"; }
status_warning() { echo -e "${BRIGHT_YELLOW}⚠️${NC}"; }
status_info() { echo -e "${BRIGHT_BLUE}ℹ️${NC}"; }
status_running() { echo -e "${BRIGHT_CYAN}🔄${NC}"; }
status_stopped() { echo -e "${GRAY}⏹️${NC}"; }

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

# 显示欢迎信息
show_welcome() {
    clear
    echo -e "${BRIGHT_CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BRIGHT_CYAN}║${BRIGHT_WHITE}                    🚀 IoT Platform 交互式终端 🚀                    ${BRIGHT_CYAN}║${NC}"
    echo -e "${BRIGHT_CYAN}║${BRIGHT_YELLOW}                        版本: 1.0.0                          ${BRIGHT_CYAN}║${NC}"
    echo -e "${BRIGHT_CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${BRIGHT_WHITE}🎉 欢迎使用 IoT Platform 交互式管理终端！${NC}"
    echo -e "${BRIGHT_GREEN}💡 输入 'help' 查看可用命令，输入 'exit' 退出${NC}"
    echo -e "${BRIGHT_PURPLE}🌟 享受色彩丰富的管理体验！${NC}"
    echo
}

# 显示帮助信息
show_help() {
    echo -e "${BRIGHT_CYAN}📋 ${BRIGHT_WHITE}可用命令${NC}"
    echo -e "${BRIGHT_CYAN}==================================${NC}"
    echo
    echo -e "${BRIGHT_GREEN}🔧 ${BRIGHT_WHITE}系统管理${NC}"
    echo -e "  ${BRIGHT_BLUE}status${NC}              - 📊 查看系统状态"
    echo -e "  ${BRIGHT_BLUE}dashboard${NC}           - 📈 实时仪表板"
    echo -e "  ${BRIGHT_BLUE}health${NC}              - 🏥 健康检查"
    echo -e "  ${BRIGHT_BLUE}resources${NC}           - 💻 系统资源"
    echo -e "  ${BRIGHT_BLUE}ps${NC}                  - 📋 服务状态"
    echo -e "  ${BRIGHT_BLUE}watch${NC}               - 👀 实时监控"
    echo -e "  ${BRIGHT_BLUE}quick${NC}               - ⚡ 快速状态检查"
    echo
    echo -e "${BRIGHT_BLUE}📋 ${BRIGHT_WHITE}日志管理${NC}"
    echo -e "  ${BRIGHT_BLUE}logs [服务]${NC}         - 📄 查看日志"
    echo -e "  ${BRIGHT_BLUE}logs tail [服务]${NC}    - 📺 实时日志"
    echo -e "  ${BRIGHT_BLUE}logs search <关键词>${NC} - 🔍 搜索日志"
    echo
    echo -e "${BRIGHT_YELLOW}🔧 ${BRIGHT_WHITE}服务管理${NC}"
    echo -e "  ${BRIGHT_BLUE}start [服务]${NC}        - ▶️ 启动服务"
    echo -e "  ${BRIGHT_BLUE}stop [服务]${NC}         - ⏹️ 停止服务"
    echo -e "  ${BRIGHT_BLUE}restart [服务]${NC}      - 🔄 重启服务"
    echo -e "  ${BRIGHT_BLUE}up${NC}                  - 🚀 启动所有服务"
    echo -e "  ${BRIGHT_BLUE}down${NC}                - 🛑 停止所有服务"
    echo -e "  ${BRIGHT_BLUE}redeploy${NC}            - 🔄 重新部署"
    echo
    echo -e "${BRIGHT_PURPLE}📱 ${BRIGHT_WHITE}设备管理${NC}"
    echo -e "  ${BRIGHT_BLUE}devices${NC}             - 📱 查看设备列表"
    echo -e "  ${BRIGHT_BLUE}mqtt-clients${NC}        - 📡 MQTT客户端连接"
    echo
    echo -e "${BRIGHT_RED}🗄️ ${BRIGHT_WHITE}数据库管理${NC}"
    echo -e "  ${BRIGHT_BLUE}db${NC}                  - 🗄️ 连接数据库"
    echo -e "  ${BRIGHT_BLUE}db-backup${NC}           - 💾 备份数据库"
    echo -e "  ${BRIGHT_BLUE}db-query <SQL>${NC}      - 🔍 执行SQL查询"
    echo -e "  ${BRIGHT_BLUE}db-reset${NC}            - ⚠️ 重置数据库"
    echo
    echo -e "${BRIGHT_CYAN}🌐 ${BRIGHT_WHITE}API测试${NC}"
    echo -e "  ${BRIGHT_BLUE}test-health${NC}         - 🏥 测试健康检查API"
    echo -e "  ${BRIGHT_BLUE}test-login${NC}          - 🔐 测试登录API"
    echo
    echo -e "${BRIGHT_WHITE}🔍 ${BRIGHT_WHITE}系统工具${NC}"
    echo -e "  ${BRIGHT_BLUE}clean${NC}               - 🧹 清理Docker缓存"
    echo -e "  ${BRIGHT_BLUE}ports${NC}               - 🔌 查看端口占用"
    echo -e "  ${BRIGHT_BLUE}network${NC}             - 🌐 网络状态"
    echo -e "  ${BRIGHT_BLUE}info${NC}                - ℹ️ 系统信息"
    echo
    echo -e "${GRAY}💡 ${BRIGHT_WHITE}特殊命令${NC}"
    echo -e "  ${BRIGHT_BLUE}clear${NC}               - 🧽 清屏"
    echo -e "  ${BRIGHT_BLUE}help${NC}                - ❓ 显示帮助"
    echo -e "  ${BRIGHT_BLUE}exit/quit${NC}           - 👋 退出终端"
    echo
}

# 执行命令
execute_command() {
    local cmd="$1"
    local args="$2"
    
    case "$cmd" in
        "status"|"dashboard"|"health"|"resources"|"ps"|"watch"|"quick")
            log_executing "执行: ${BRIGHT_BLUE}$cmd${NC}"
            ./scripts/iot-cli.sh "$cmd" $args
            log_success "命令执行完成"
            ;;
        "logs")
            log_executing "执行: ${BRIGHT_BLUE}logs${NC} $args"
            ./scripts/iot-cli.sh logs $args
            log_success "日志查看完成"
            ;;
        "start"|"stop"|"restart"|"up"|"down")
            log_executing "执行: ${BRIGHT_YELLOW}$cmd${NC} $args"
            ./scripts/iot-cli.sh "$cmd" $args
            log_success "服务操作完成"
            ;;
        "redeploy")
            log_executing "执行: ${BRIGHT_PURPLE}重新部署${NC}..."
            ./scripts/redeploy.sh
            log_success "重新部署完成"
            ;;
        "devices"|"mqtt-clients")
            log_executing "执行: ${BRIGHT_PURPLE}$cmd${NC}"
            ./scripts/iot-cli.sh "$cmd"
            log_success "设备信息获取完成"
            ;;
        "db")
            log_executing "执行: ${BRIGHT_RED}数据库操作${NC} $args"
            ./scripts/iot-cli.sh db $args
            log_success "数据库操作完成"
            ;;
        "db-backup")
            log_executing "执行: ${BRIGHT_RED}数据库备份${NC}..."
            ./scripts/iot-cli.sh db-backup
            log_success "数据库备份完成"
            ;;
        "db-query")
            log_executing "执行: ${BRIGHT_RED}SQL查询${NC}: $args"
            ./scripts/iot-cli.sh db-query "$args"
            log_success "SQL查询完成"
            ;;
        "db-reset")
            log_warning "⚠️ 确认要重置数据库吗？这将删除所有数据！"
            echo -e "${BRIGHT_RED}⚠️ 这是一个危险操作！${NC}"
            read -p "输入 'yes' 确认: " confirm
            if [ "$confirm" = "yes" ]; then
                log_executing "执行: ${BRIGHT_RED}重置数据库${NC}..."
                ./scripts/reset-database.sh
                log_success "数据库重置完成"
            else
                log_info "取消数据库重置"
            fi
            ;;
        "test-health"|"test-login")
            log_executing "执行: ${BRIGHT_CYAN}$cmd${NC}"
            ./scripts/iot-cli.sh "$cmd"
            log_success "API测试完成"
            ;;
        "clean"|"ports"|"network"|"info")
            log_executing "执行: ${BRIGHT_WHITE}$cmd${NC}"
            ./scripts/iot-cli.sh "$cmd"
            log_success "系统工具执行完成"
            ;;
        "clear")
            clear
            show_welcome
            ;;
        "help")
            show_help
            ;;
        "exit"|"quit")
            echo -e "${BRIGHT_GREEN}👋 再见！感谢使用 IoT Platform 交互式终端！${NC}"
            echo -e "${BRIGHT_PURPLE}🌟 期待下次再见！${NC}"
            exit 0
            ;;
        "")
            # 空命令，不执行任何操作
            ;;
        *)
            log_error "未知命令: ${BRIGHT_RED}$cmd${NC}"
            echo -e "${BRIGHT_YELLOW}💡 输入 'help' 查看可用命令${NC}"
            echo -e "${BRIGHT_CYAN}🔍 或者尝试以下常用命令:${NC}"
            echo -e "  ${BRIGHT_BLUE}quick${NC} - 快速状态检查"
            echo -e "  ${BRIGHT_BLUE}status${NC} - 详细系统状态"
            echo -e "  ${BRIGHT_BLUE}dashboard${NC} - 实时仪表板"
            ;;
    esac
}

# 显示命令提示符
show_prompt() {
    local time=$(date '+%H:%M:%S')
    echo -ne "${BRIGHT_CYAN}🚀 iot-platform${NC}${BRIGHT_WHITE}@${NC}${BRIGHT_GREEN}$(hostname)${NC}${BRIGHT_WHITE}:${NC}${BRIGHT_BLUE}$(basename $(pwd))${NC}${BRIGHT_YELLOW} [$time]${NC}${BRIGHT_WHITE}$ ${NC}"
}

# 主循环
main_loop() {
    local command_count=0
    while true; do
        echo
        show_prompt
        read -r input
        
        # 增加命令计数
        command_count=$((command_count + 1))
        
        # 解析输入
        local cmd=$(echo "$input" | awk '{print $1}')
        local args=$(echo "$input" | awk '{$1=""; print $0}' | sed 's/^ *//')
        
        # 显示分隔线
        if [ "$cmd" != "clear" ] && [ "$cmd" != "" ]; then
            echo -e "${BRIGHT_CYAN}────────────────────────────────────────────────────────${NC}"
        fi
        
        # 执行命令
        execute_command "$cmd" "$args"
        
        # 显示分隔线
        if [ "$cmd" != "clear" ] && [ "$cmd" != "" ]; then
            echo -e "${BRIGHT_CYAN}────────────────────────────────────────────────────────${NC}"
        fi
    done
}

# 主函数
main() {
    check_environment
    show_welcome
    
    # 显示初始状态
    echo -e "${BRIGHT_WHITE}🔧 ${BRIGHT_WHITE}当前系统状态:${NC}"
    ./scripts/iot-cli.sh quick
    echo
    echo -e "${BRIGHT_GREEN}🎯 ${BRIGHT_WHITE}准备就绪！开始您的 IoT 平台管理之旅吧！${NC}"
    echo -e "${BRIGHT_PURPLE}💡 ${BRIGHT_WHITE}提示: 输入 'help' 查看所有可用命令${NC}"
    echo
    
    # 进入交互循环
    main_loop
}

# 捕获 Ctrl+C
trap 'echo -e "\n${BRIGHT_GREEN}👋 再见！感谢使用 IoT Platform 交互式终端！${NC}"; echo -e "${BRIGHT_PURPLE}🌟 期待下次再见！${NC}"; exit 0' INT

# 运行主函数
main "$@"
