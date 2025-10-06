#!/bin/bash

# IoT 平台快速重启脚本
# 功能：快速重启所有服务，不清理缓存

set -e

echo "🔄 IoT 平台快速重启脚本"
echo "========================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

echo -e "${BLUE}🔄 重启所有服务...${NC}"
docker-compose restart

echo -e "${GREEN}✅ 服务重启完成！${NC}"

# 显示服务状态
echo ""
echo -e "${BLUE}📊 服务状态：${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✨ 重启完成！${NC}"
