# Docker 配置管理

## 🎯 基线 + 覆盖 配置模式

本项目采用"基线 + 覆盖"的配置管理模式，避免配置重复和漂移。

### 📁 配置结构

```
docker/
├── emqx/
│   ├── emqx.conf          # 基线配置
│   └── emqx.prod.conf     # 生产环境覆盖
├── postgres/
│   ├── postgresql.conf    # 基线配置
│   ├── postgresql.prod.conf # 生产环境覆盖
│   └── pg_hba.conf        # 认证配置（通用）
├── redis/
│   ├── redis.conf         # 基线配置
│   └── redis.prod.conf    # 生产环境覆盖
├── backend/
│   ├── config.json        # 基线配置
│   └── config.prod.json   # 生产环境覆盖
└── frontend/
    └── config.json        # 基线配置（通用）
```

### 🚀 使用方法

#### 开发环境（默认）
```bash
# 使用基线配置
docker-compose up -d

# 或显式指定
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

#### 生产环境
```bash
# 使用生产环境覆盖配置
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 📋 配置原则

1. **基线配置**：包含所有通用配置项，适合开发环境
2. **覆盖配置**：只包含与基线不同的配置项
3. **避免重复**：覆盖文件不重复基线配置
4. **环境隔离**：不同环境使用不同的覆盖文件

### 🔧 配置示例

#### EMQX 配置对比

**基线配置 (emqx.conf)**：
```hocon
listeners {
  tcp {
    default {
      max_connections = 1000
    }
  }
}
```

**生产覆盖 (emqx.prod.conf)**：
```hocon
listeners {
  tcp {
    default {
      max_connections = 1024000  # 只覆盖不同的值
    }
  }
}
```

#### Backend 配置对比

**基线配置 (config.json)**：
```json
{
  "server": {
    "cors": {
      "origin": ["http://localhost:3000"]
    }
  }
}
```

**生产覆盖 (config.prod.json)**：
```json
{
  "server": {
    "cors": {
      "origin": ["https://fountain.top"]  // 只覆盖不同的值
    }
  }
}
```

### 🎯 优势

1. **避免配置漂移**：基线配置统一，覆盖配置最小化
2. **易于维护**：修改基线配置影响所有环境
3. **环境隔离**：生产环境配置独立管理
4. **版本控制友好**：配置变更历史清晰
5. **部署灵活**：通过compose文件选择环境

### 📝 最佳实践

1. **基线配置**：包含开发环境所需的所有配置
2. **覆盖配置**：只包含与基线不同的配置项
3. **命名规范**：使用 `.prod.conf` 或 `.prod.json` 后缀
4. **文档更新**：配置变更时更新此文档
5. **测试验证**：部署前验证配置正确性

### 🔍 故障排查

1. **配置未生效**：检查compose文件挂载路径
2. **服务启动失败**：查看容器日志确认配置语法
3. **环境差异**：确认使用了正确的compose文件组合
4. **权限问题**：检查配置文件读取权限

### 📚 相关文档

- [Docker Compose 官方文档](https://docs.docker.com/compose/)
- [EMQX 配置文档](https://docs.emqx.com/)
- [PostgreSQL 配置文档](https://www.postgresql.org/docs/)
- [Redis 配置文档](https://redis.io/docs/)
