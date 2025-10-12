# Fountain IoT Platform - Makefile
# 简化 Docker Compose 操作的管理脚本

.PHONY: help init network start stop restart logs health clean

# 颜色定义
BLUE := \033[1;34m
GREEN := \033[1;32m
YELLOW := \033[1;33m
RED := \033[1;31m
NC := \033[0m # No Color

# 默认目标
.DEFAULT_GOAL := help

##@ 帮助

help: ## 显示帮助信息
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Fountain IoT Platform - 管理命令$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""

##@ 初始化

init: ## 初始化项目（首次运行）
	@echo "$(GREEN)初始化 IoT 平台...$(NC)"
	@mkdir -p data/{postgres,timescaledb,redis,nats,emqx,minio}
	@mkdir -p configs/{postgres,timescaledb,emqx,prometheus,grafana,loki,promtail}
	@mkdir -p logs
	@cp -n .env.example .env 2>/dev/null || true
	@echo "$(GREEN)✓ 目录结构创建完成$(NC)"
	@echo "$(YELLOW)请编辑 .env 文件配置环境变量$(NC)"

network: ## 创建 Docker 网络
	@echo "$(GREEN)创建 Docker 网络...$(NC)"
	@docker network create iot-net 2>/dev/null || echo "$(YELLOW)网络已存在$(NC)"

##@ 启动服务

start-infra: network ## 启动基础设施（必需）
	@echo "$(GREEN)启动基础设施服务...$(NC)"
	@docker compose up -d
	@echo "$(GREEN)✓ 基础设施已启动$(NC)"
	@$(MAKE) wait-infra

start-phase1: start-infra ## 启动 Phase 1 服务（MVP）
	@echo "$(GREEN)启动 Phase 1 核心服务...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.phase1.yml up -d
	@echo "$(GREEN)✓ Phase 1 服务已启动$(NC)"
	@$(MAKE) health-phase1

start-phase2: start-phase1 ## 启动 Phase 2 服务（多租户+多协议）
	@echo "$(GREEN)启动 Phase 2 扩展服务...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.phase1.yml -f docker-compose.phase2.yml up -d
	@echo "$(GREEN)✓ Phase 2 服务已启动$(NC)"
	@$(MAKE) health-phase2

start-phase3: start-phase2 ## 启动 Phase 3 服务（视频流+监控）
	@echo "$(GREEN)启动 Phase 3 高级服务...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.phase1.yml -f docker-compose.phase2.yml -f docker-compose.phase3.yml up -d
	@echo "$(GREEN)✓ Phase 3 服务已启动$(NC)"
	@$(MAKE) health-phase3

start-all: start-phase3 ## 启动所有服务

##@ 停止服务

stop-phase3: ## 停止 Phase 3 服务
	@echo "$(YELLOW)停止 Phase 3 服务...$(NC)"
	@docker compose -f docker-compose.phase3.yml down
	@echo "$(GREEN)✓ Phase 3 服务已停止$(NC)"

stop-phase2: ## 停止 Phase 2 服务
	@echo "$(YELLOW)停止 Phase 2 服务...$(NC)"
	@docker compose -f docker-compose.phase2.yml down
	@echo "$(GREEN)✓ Phase 2 服务已停止$(NC)"

stop-phase1: ## 停止 Phase 1 服务
	@echo "$(YELLOW)停止 Phase 1 服务...$(NC)"
	@docker compose -f docker-compose.phase1.yml down
	@echo "$(GREEN)✓ Phase 1 服务已停止$(NC)"

stop-infra: ## 停止基础设施
	@echo "$(YELLOW)停止基础设施...$(NC)"
	@docker compose down
	@echo "$(GREEN)✓ 基础设施已停止$(NC)"

stop-all: ## 停止所有服务
	@echo "$(YELLOW)停止所有服务...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.phase1.yml -f docker-compose.phase2.yml -f docker-compose.phase3.yml down
	@echo "$(GREEN)✓ 所有服务已停止$(NC)"

##@ 重启服务

restart-phase1: ## 重启 Phase 1 服务
	@$(MAKE) stop-phase1
	@$(MAKE) start-phase1

restart-phase2: ## 重启 Phase 2 服务
	@$(MAKE) stop-phase2
	@$(MAKE) start-phase2

restart-phase3: ## 重启 Phase 3 服务
	@$(MAKE) stop-phase3
	@$(MAKE) start-phase3

restart-all: ## 重启所有服务
	@$(MAKE) stop-all
	@$(MAKE) start-all

##@ 日志查看

logs: ## 查看所有服务日志
	@docker compose -f docker-compose.yml -f docker-compose.phase1.yml -f docker-compose.phase2.yml -f docker-compose.phase3.yml logs -f

logs-infra: ## 查看基础设施日志
	@docker compose logs -f

logs-phase1: ## 查看 Phase 1 服务日志
	@docker compose -f docker-compose.phase1.yml logs -f

logs-phase2: ## 查看 Phase 2 服务日志
	@docker compose -f docker-compose.phase2.yml logs -f

logs-phase3: ## 查看 Phase 3 服务日志
	@docker compose -f docker-compose.phase3.yml logs -f

logs-auth: ## 查看认证服务日志
	@docker compose -f docker-compose.phase1.yml logs -f auth-service

logs-device: ## 查看设备服务日志
	@docker compose -f docker-compose.phase1.yml logs -f device-service

logs-telemetry: ## 查看遥测服务日志
	@docker compose -f docker-compose.phase1.yml logs -f telemetry-service

logs-gateway: ## 查看协议网关日志
	@docker compose -f docker-compose.phase2.yml logs -f protocol-gateway

##@ 健康检查

health: ## 检查所有服务健康状态
	@echo "$(BLUE)检查服务健康状态...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.phase1.yml -f docker-compose.phase2.yml -f docker-compose.phase3.yml ps

health-infra: ## 检查基础设施健康状态
	@echo "$(BLUE)基础设施状态:$(NC)"
	@docker compose ps

health-phase1: ## 检查 Phase 1 服务状态
	@echo "$(BLUE)Phase 1 服务状态:$(NC)"
	@docker compose -f docker-compose.phase1.yml ps

health-phase2: ## 检查 Phase 2 服务状态
	@echo "$(BLUE)Phase 2 服务状态:$(NC)"
	@docker compose -f docker-compose.phase2.yml ps

health-phase3: ## 检查 Phase 3 服务状态
	@echo "$(BLUE)Phase 3 服务状态:$(NC)"
	@docker compose -f docker-compose.phase3.yml ps

wait-infra: ## 等待基础设施就绪
	@echo "$(YELLOW)等待基础设施就绪...$(NC)"
	@for i in $$(seq 1 30); do \
		if docker compose ps | grep -q "healthy"; then \
			echo "$(GREEN)✓ 基础设施已就绪$(NC)"; \
			break; \
		fi; \
		echo "等待中... ($$i/30)"; \
		sleep 2; \
	done

##@ 数据库管理

db-migrate: ## 运行数据库迁移
	@echo "$(GREEN)运行数据库迁移...$(NC)"
	@docker compose -f docker-compose.phase1.yml exec auth-service npm run migrate
	@docker compose -f docker-compose.phase1.yml exec device-service npm run migrate
	@echo "$(GREEN)✓ 迁移完成$(NC)"

db-seed: ## 填充初始数据
	@echo "$(GREEN)填充初始数据...$(NC)"
	@docker compose -f docker-compose.phase1.yml exec auth-service npm run seed
	@echo "$(GREEN)✓ 数据填充完成$(NC)"

db-reset: ## 重置数据库（危险操作）
	@echo "$(RED)警告: 这将删除所有数据!$(NC)"
	@read -p "确认继续? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		docker volume rm iot-platform_postgres-data iot-platform_timescaledb-data 2>/dev/null || true; \
		echo "$(GREEN)✓ 数据库已重置$(NC)"; \
	fi

##@ 开发工具

shell-auth: ## 进入认证服务容器
	@docker compose -f docker-compose.phase1.yml exec auth-service sh

shell-device: ## 进入设备服务容器
	@docker compose -f docker-compose.phase1.yml exec device-service sh

shell-postgres: ## 进入 PostgreSQL 容器
	@docker compose exec postgres psql -U iot_user -d iot_platform

shell-redis: ## 进入 Redis 容器
	@docker compose exec redis redis-cli -a $${REDIS_PASSWORD:-redis_password_2025}

shell-nats: ## NATS 管理界面
	@echo "$(BLUE)NATS 管理地址: http://localhost:8222$(NC)"
	@open http://localhost:8222 2>/dev/null || xdg-open http://localhost:8222 2>/dev/null || echo "请手动访问"

##@ 监控面板

dashboard: ## 打开所有管理面板
	@echo "$(BLUE)打开管理面板...$(NC)"
	@echo "前端:          http://localhost:3000"
	@echo "EMQX:         http://localhost:18083 (admin/public2025)"
	@echo "MinIO:        http://localhost:9001 (minio_admin/minio_password_2025)"
	@echo "NATS:         http://localhost:8222"
	@echo "Prometheus:   http://localhost:9090"
	@echo "Grafana:      http://localhost:3001 (admin/admin2025)"

open-frontend: ## 打开前端界面
	@open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null

open-emqx: ## 打开 EMQX 控制台
	@open http://localhost:18083 2>/dev/null || xdg-open http://localhost:18083 2>/dev/null

open-grafana: ## 打开 Grafana
	@open http://localhost:3001 2>/dev/null || xdg-open http://localhost:3001 2>/dev/null

##@ 构建与更新

build-all: ## 构建所有服务镜像
	@echo "$(GREEN)构建所有服务镜像...$(NC)"
	@docker compose -f docker-compose.phase1.yml build
	@docker compose -f docker-compose.phase2.yml build
	@docker compose -f docker-compose.phase3.yml build
	@echo "$(GREEN)✓ 构建完成$(NC)"

build-phase1: ## 构建 Phase 1 服务
	@docker compose -f docker-compose.phase1.yml build

build-phase2: ## 构建 Phase 2 服务
	@docker compose -f docker-compose.phase2.yml build

build-phase3: ## 构建 Phase 3 服务
	@docker compose -f docker-compose.phase3.yml build

pull: ## 拉取最新镜像
	@echo "$(GREEN)拉取最新镜像...$(NC)"
	@docker compose pull
	@docker compose -f docker-compose.phase1.yml pull
	@docker compose -f docker-compose.phase2.yml pull
	@docker compose -f docker-compose.phase3.yml pull

##@ 清理

clean-logs: ## 清理日志文件
	@echo "$(YELLOW)清理日志...$(NC)"
	@rm -rf logs/*
	@echo "$(GREEN)✓ 日志已清理$(NC)"

clean-volumes: ## 删除所有数据卷（危险）
	@echo "$(RED)警告: 这将删除所有持久化数据!$(NC)"
	@read -p "确认继续? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		echo "$(GREEN)✓ 数据卷已删除$(NC)"; \
	fi

clean-images: ## 删除未使用的镜像
	@echo "$(YELLOW)清理未使用的镜像...$(NC)"
	@docker image prune -f
	@echo "$(GREEN)✓ 镜像已清理$(NC)"

clean-all: stop-all clean-volumes clean-images clean-logs ## 完全清理（危险）
	@echo "$(RED)所有数据已清理$(NC)"

##@ 测试

test-api: ## 测试 API 连接
	@echo "$(BLUE)测试 API 连接...$(NC)"
	@curl -s http://localhost:8001/health && echo "$(GREEN)✓ Auth Service$(NC)" || echo "$(RED)✗ Auth Service$(NC)"
	@curl -s http://localhost:8003/health && echo "$(GREEN)✓ Device Service$(NC)" || echo "$(RED)✗ Device Service$(NC)"
	@curl -s http://localhost:8004/health && echo "$(GREEN)✓ Telemetry Service$(NC)" || echo "$(RED)✗ Telemetry Service$(NC)"

test-mqtt: ## 测试 MQTT 连接
	@echo "$(BLUE)测试 MQTT 连接...$(NC)"
	@docker run --rm --network iot-net eclipse-mosquitto mosquitto_sub -h emqx -t 'test/#' -C 1 -W 5 && \
		echo "$(GREEN)✓ MQTT 连接成功$(NC)" || echo "$(RED)✗ MQTT 连接失败$(NC)"

##@ 备份与恢复

backup: ## 备份数据
	@echo "$(GREEN)备份数据...$(NC)"
	@mkdir -p backups
	@docker compose exec -T postgres pg_dump -U iot_user iot_platform > backups/postgres_$$(date +%Y%m%d_%H%M%S).sql
	@docker compose exec -T timescaledb pg_dump -U iot_user iot_timeseries > backups/timescaledb_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ 备份完成$(NC)"

restore: ## 恢复数据（需要指定文件）
	@echo "$(YELLOW)请指定备份文件: make restore FILE=backups/postgres_xxx.sql$(NC)"

##@ 系统信息

info: ## 显示系统信息
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  Fountain IoT Platform - 系统信息$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "Docker 版本:"
	@docker --version
	@echo ""
	@echo "Docker Compose 版本:"
	@docker compose version
	@echo ""
	@echo "运行中的容器:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep iot- || echo "无"
	@echo ""
	@echo "磁盘使用:"
	@df -h | grep -E "Filesystem|/var/lib/docker" || df -h
	@echo ""

version: ## 显示项目版本
	@echo "$(BLUE)Fountain IoT Platform v1.0.0$(NC)"

##@ 快速启动（推荐）

quick-start: init network start-phase1 ## 快速启动（首次使用）
	@echo ""
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)  ✓ IoT 平台已启动！$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "访问地址:"
	@echo "  前端:      $(BLUE)http://localhost:3000$(NC)"
	@echo "  EMQX:     $(BLUE)http://localhost:18083$(NC) (admin/public2025)"
	@echo "  MinIO:    $(BLUE)http://localhost:9001$(NC)"
	@echo ""
	@echo "下一步:"
	@echo "  1. 访问前端创建第一个租户"
	@echo "  2. 注册设备并获取 Token"
	@echo "  3. 使用 MQTT 客户端连接测试"
	@echo ""
	@echo "查看日志: $(YELLOW)make logs$(NC)"
	@echo "查看帮助: $(YELLOW)make help$(NC)"
	@echo ""

