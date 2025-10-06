# 管理工具和日志架构升级指南

## 🎯 升级概述

本次升级完成了以下重要改进：

1. **管理工具现代化**: 删除过时脚本，创建统一的CLI工具
2. **日志架构重构**: 实现项目级日志目录，便于管理
3. **配置优化**: 完善基线+覆盖配置模式

## 📋 变更清单

### ✅ 已删除的文件

- ❌ `iot-manager.sh` - 旧版交互式管理工具
- ❌ `quick-commands.sh` - 旧版快速命令工具

### ✅ 新增的文件

- ✅ `scripts/iot-cli.sh` - 现代化CLI管理工具
- ✅ `scripts/setup-logs.sh` - 项目级日志目录设置脚本
- ✅ `docs/management/README.md` - 管理工具文档

### ✅ 更新的文件

- ✅ `aliases.sh` - 更新别名引用
- ✅ `scripts/deploy.sh` - 集成日志设置
- ✅ `docs/deployment/README.md` - 更新部署文档
- ✅ `docs/README.md` - 添加管理工具文档链接

## 🚀 新功能特性

### 1. 现代化CLI工具 (`iot-cli.sh`)

**统一命令接口**:
```bash
./scripts/iot-cli.sh [命令] [选项]
```

**主要功能**:
- 📊 系统管理 (status, health, resources, ps)
- 📋 日志管理 (logs, search, stats, export)
- 🔧 服务管理 (start, stop, restart, up, down)
- 📱 设备管理 (devices, powersafe, mqtt-clients)
- 🗄️ 数据库管理 (db, db-backup, db-query)
- 🌐 API测试 (test-health, test-powersafe, test-login)
- 🔍 系统工具 (clean, ports, network, info)

### 2. 项目级日志目录

**架构设计**:
```
/opt/iot-platform/logs/
├── backend/container.log -> /var/lib/docker/containers/.../container-json.log
├── frontend/container.log -> /var/lib/docker/containers/.../container-json.log
├── postgres/container.log -> /var/lib/docker/containers/.../container-json.log
├── redis/container.log -> /var/lib/docker/containers/.../container-json.log
└── emqx/container.log -> /var/lib/docker/containers/.../container-json.log
```

**优势**:
- 🎯 集中管理: 所有日志在项目目录下
- 🔗 符号链接: 指向Docker实际日志文件
- 📊 便于分析: 支持grep、tail等标准工具
- 🔄 自动同步: 与Docker日志实时同步

## 🔄 迁移指南

### 从旧工具迁移

| 旧命令 | 新命令 |
|--------|--------|
| `./iot-manager.sh` | `./scripts/iot-cli.sh` |
| `./quick-commands.sh logs` | `./scripts/iot-cli.sh logs tail` |
| `./quick-commands.sh status` | `./scripts/iot-cli.sh status` |

### 别名更新

```bash
# 旧别名
iot-manager    # 已删除
iot-help       # 已更新

# 新别名
iot-cli        # 新的CLI工具
iot-help       # 现在指向iot-cli.sh help
```

### 日志查看方式

**旧方式**:
```bash
docker-compose logs -f backend
docker-compose logs --tail=100 backend
```

**新方式 (推荐)**:
```bash
# 使用CLI工具
./scripts/iot-cli.sh logs tail backend
./scripts/iot-cli.sh logs search "error"

# 直接访问项目日志
tail -f logs/backend/container.log
grep -r "error" logs/
```

## 🛠️ 使用指南

### 1. 首次设置

```bash
# 设置项目级日志目录
./scripts/setup-logs.sh

# 验证设置
ls -la logs/
```

### 2. 日常使用

```bash
# 快速状态检查
./scripts/iot-cli.sh status

# 查看日志
./scripts/iot-cli.sh logs tail backend

# 搜索错误
./scripts/iot-cli.sh logs search "error"

# 重启服务
./scripts/iot-cli.sh restart backend
```

### 3. 故障排查

```bash
# 健康检查
./scripts/iot-cli.sh health

# 查看资源使用
./scripts/iot-cli.sh resources

# 查看错误日志
./scripts/iot-cli.sh logs search "error"

# 查看特定服务日志
tail -f logs/backend/container.log
```

## 📊 性能对比

### 日志管理

| 功能 | 旧方式 | 新方式 | 改进 |
|------|--------|--------|------|
| 日志位置 | `/var/lib/docker/containers/` | `./logs/` | ✅ 项目级管理 |
| 查看方式 | `docker-compose logs` | `./scripts/iot-cli.sh logs` | ✅ 统一接口 |
| 搜索功能 | `grep` + 复杂路径 | `./scripts/iot-cli.sh logs search` | ✅ 简化操作 |
| 统计分析 | 手动统计 | `./scripts/iot-cli.sh logs stats` | ✅ 自动化 |

### 管理工具

| 功能 | 旧工具 | 新工具 | 改进 |
|------|--------|--------|------|
| 接口类型 | 交互式菜单 | 命令行参数 | ✅ 脚本友好 |
| 功能数量 | 30个菜单项 | 20+个命令 | ✅ 精简高效 |
| 扩展性 | 硬编码菜单 | 模块化设计 | ✅ 易于扩展 |
| 文档 | 内嵌帮助 | 独立文档 | ✅ 详细完整 |

## 🔧 配置说明

### Docker日志配置

所有服务都配置了统一的日志驱动：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
    labels: "service=service_name,component=component_name"
```

### 日志轮转

- **文件大小**: 10MB
- **保留文件**: 5个
- **格式**: JSON
- **标签**: 服务分类

## 🎯 最佳实践

### 1. 日常监控

```bash
# 每日检查脚本
#!/bin/bash
./scripts/iot-cli.sh status
./scripts/iot-cli.sh health
./scripts/iot-cli.sh logs search "error"
```

### 2. 故障排查流程

1. 检查服务状态: `./scripts/iot-cli.sh status`
2. 健康检查: `./scripts/iot-cli.sh health`
3. 查看错误日志: `./scripts/iot-cli.sh logs search "error"`
4. 查看特定服务: `./scripts/iot-cli.sh logs tail [service]`
5. 重启服务: `./scripts/iot-cli.sh restart [service]`

### 3. 日志分析

```bash
# 导出日志分析
./scripts/iot-cli.sh logs export backend > backend.log

# 使用jq解析JSON日志
tail -f logs/backend/container.log | jq '.'

# 搜索特定模式
grep -r "MQTT" logs/backend/
```

## 🚨 注意事项

### 1. 权限要求

- 需要root权限创建符号链接
- Docker日志文件需要读取权限

### 2. 容器重启

- 容器重启后需要重新运行 `./scripts/setup-logs.sh`
- 符号链接会自动更新到新的容器ID

### 3. 磁盘空间

- 日志文件会占用磁盘空间
- 定期清理: `./scripts/iot-cli.sh logs clean`

## 📈 未来规划

### 短期目标

- [ ] 添加日志聚合功能
- [ ] 实现日志告警
- [ ] 支持日志导出格式选择

### 长期目标

- [ ] 集成ELK Stack
- [ ] 实现分布式日志收集
- [ ] 添加日志分析仪表板

## 🤝 反馈和支持

如果在使用过程中遇到问题，请：

1. 查看[管理工具文档](docs/management/README.md)
2. 查看[故障排查文档](docs/troubleshooting/README.md)
3. 提交GitHub Issue
4. 联系技术支持

---

**升级完成时间**: 2024-10-06  
**版本**: v2.0.0  
**兼容性**: 向后兼容，支持渐进式迁移
