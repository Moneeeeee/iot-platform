#!/bin/bash

# Fountain IoT Platform - 初始化脚本
# 快速初始化项目环境

set -e

echo "=================================================="
echo "  Fountain IoT Platform - 初始化脚本"
echo "=================================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose 2.0+"
    exit 1
fi

echo "✅ Docker 和 Docker Compose 已安装"
echo ""

# 创建必要的目录
echo "📁 创建项目目录..."
mkdir -p data/{postgres,timescaledb,redis,nats,emqx,minio}
mkdir -p logs
mkdir -p backups
echo "✅ 目录创建完成"
echo ""

# 复制环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "✅ .env 文件已创建"
    echo "⚠️  请编辑 .env 文件修改默认密码（生产环境必须！）"
else
    echo "✅ .env 文件已存在"
fi
echo ""

# 创建 Docker 网络
echo "🌐 创建 Docker 网络..."
docker network create iot-net 2>/dev/null || echo "ℹ️  网络已存在"
echo ""

# 显示下一步
echo "=================================================="
echo "  ✅ 初始化完成！"
echo "=================================================="
echo ""
echo "下一步："
echo "  1. 编辑 .env 文件修改默认密码（推荐）"
echo "     nano .env"
echo ""
echo "  2. 启动 Phase 1 服务"
echo "     make start-phase1"
echo ""
echo "  3. 检查服务状态"
echo "     make health"
echo ""
echo "  4. 访问管理界面"
echo "     前端:      http://localhost:3000"
echo "     EMQX:     http://localhost:18083"
echo "     MinIO:    http://localhost:9001"
echo ""
echo "查看所有命令: make help"
echo ""

