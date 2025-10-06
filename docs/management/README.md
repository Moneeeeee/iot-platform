# 管理工具文档

## 🛠️ 现代化CLI工具

IoT平台提供了统一的命令行管理工具 `iot-cli.sh`，替代了旧版的管理脚本。

### 快速开始

```bash
# 查看帮助
./scripts/iot-cli.sh help

# 查看系统状态
./scripts/iot-cli.sh status

# 查看服务健康状态
./scripts/iot-cli.sh health
```

### 📊 系统管理

```bash
# 查看系统状态
./scripts/iot-cli.sh status

# 健康检查
./scripts/iot-cli.sh health

# 系统资源使用
./scripts/iot-cli.sh resources

# 服务状态
./scripts/iot-cli.sh ps
```

### 📋 日志管理

CLI工具集成了专业的日志管理功能：

```bash
# 实时查看所有日志
./scripts/iot-cli.sh logs tail

# 查看特定服务日志
./scripts/iot-cli.sh logs tail backend
./scripts/iot-cli.sh logs tail frontend

# 搜索日志内容
./scripts/iot-cli.sh logs search "error"
./scripts/iot-cli.sh logs search "MQTT" backend

# 日志统计
./scripts/iot-cli.sh logs stats

# 导出日志
./scripts/iot-cli.sh logs export backend > backend.log

# 清理旧日志
./scripts/iot-cli.sh logs clean
```

### 🔧 服务管理

```bash
# 启动所有服务
./scripts/iot-cli.sh up

# 停止所有服务
./scripts/iot-cli.sh down

# 重启所有服务
./scripts/iot-cli.sh restart

# 重启特定服务
./scripts/iot-cli.sh restart backend
./scripts/iot-cli.sh restart frontend

# 启动特定服务
./scripts/iot-cli.sh start postgres

# 停止特定服务
./scripts/iot-cli.sh stop redis
```

### 📱 设备管理

```bash
# 查看设备列表
./scripts/iot-cli.sh devices

# PowerSafe设备状态
./scripts/iot-cli.sh powersafe

# MQTT客户端连接
./scripts/iot-cli.sh mqtt-clients
```

### 🗄️ 数据库管理

```bash
# 连接数据库
./scripts/iot-cli.sh db

# 备份数据库
./scripts/iot-cli.sh db-backup

# 执行SQL查询
./scripts/iot-cli.sh db-query "SELECT * FROM devices LIMIT 5;"
```

### 🌐 API测试

```bash
# 测试健康检查API
./scripts/iot-cli.sh test-health

# 测试PowerSafe API
./scripts/iot-cli.sh test-powersafe

# 测试登录API
./scripts/iot-cli.sh test-login
```

### 🔍 系统工具

```bash
# 清理Docker缓存
./scripts/iot-cli.sh clean

# 查看端口占用
./scripts/iot-cli.sh ports

# 网络状态
./scripts/iot-cli.sh network

# 系统信息
./scripts/iot-cli.sh info
```

## 📁 项目级日志目录

### 架构设计

新的日志架构将Docker容器日志链接到项目目录，便于管理和查看：

```
/opt/iot-platform/logs/
├── backend/
│   └── container.log -> /var/lib/docker/containers/.../container-json.log
├── frontend/
│   └── container.log -> /var/lib/docker/containers/.../container-json.log
├── postgres/
│   └── container.log -> /var/lib/docker/containers/.../container-json.log
├── redis/
│   └── container.log -> /var/lib/docker/containers/.../container-json.log
└── emqx/
    └── container.log -> /var/lib/docker/containers/.../container-json.log
```

### 设置日志目录

```bash
# 自动设置项目级日志目录
./scripts/setup-logs.sh
```

### 日志查看命令

```bash
# 实时查看所有日志
tail -f logs/*/container.log

# 查看特定服务日志
tail -f logs/backend/container.log
tail -f logs/frontend/container.log

# 搜索日志内容
grep -r "error" logs/
grep -r "MQTT" logs/backend/

# 使用jq解析JSON日志
tail -f logs/backend/container.log | jq '.'
```

## 🔄 从旧版工具迁移

### 已删除的脚本

- ❌ `iot-manager.sh` - 交互式菜单工具
- ❌ `quick-commands.sh` - 快速命令提示工具

### 替代方案

| 旧命令 | 新命令 |
|--------|--------|
| `./iot-manager.sh` | `./scripts/iot-cli.sh` |
| `./quick-commands.sh logs` | `./scripts/iot-cli.sh logs tail` |
| `./quick-commands.sh status` | `./scripts/iot-cli.sh status` |

### 别名更新

```bash
# 加载新的别名
source aliases.sh

# 使用新的别名
iot-cli status
iot-cli logs tail backend
iot-help
```

## 🎯 最佳实践

### 1. 日常监控

```bash
# 快速状态检查
./scripts/iot-cli.sh status

# 健康检查
./scripts/iot-cli.sh health

# 查看错误日志
./scripts/iot-cli.sh logs search "error"
```

### 2. 故障排查

```bash
# 查看特定服务日志
./scripts/iot-cli.sh logs tail backend

# 搜索特定错误
./scripts/iot-cli.sh logs search "Redis client error"

# 查看系统资源
./scripts/iot-cli.sh resources
```

### 3. 服务管理

```bash
# 重启有问题的服务
./scripts/iot-cli.sh restart backend

# 完全重启所有服务
./scripts/iot-cli.sh down && ./scripts/iot-cli.sh up
```

### 4. 日志分析

```bash
# 导出日志进行分析
./scripts/iot-cli.sh logs export backend > backend.log

# 查看日志统计
./scripts/iot-cli.sh logs stats

# 清理旧日志
./scripts/iot-cli.sh logs clean
```

## 🔧 高级用法

### 组合命令

```bash
# 重启服务并查看日志
./scripts/iot-cli.sh restart backend && ./scripts/iot-cli.sh logs tail backend

# 健康检查后查看资源使用
./scripts/iot-cli.sh health && ./scripts/iot-cli.sh resources
```

### 脚本集成

```bash
#!/bin/bash
# 监控脚本示例

# 检查服务状态
if ! ./scripts/iot-cli.sh health | grep -q "healthy"; then
    echo "服务不健康，正在重启..."
    ./scripts/iot-cli.sh restart
fi

# 检查错误日志
error_count=$(./scripts/iot-cli.sh logs search "error" | wc -l)
if [ $error_count -gt 10 ]; then
    echo "发现 $error_count 个错误，需要关注"
fi
```

---

**注意**: 新工具完全向后兼容，同时提供了更强大和现代化的功能。建议逐步迁移到新的CLI工具。
