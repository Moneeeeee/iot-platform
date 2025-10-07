# Docker 配置文件说明

## 📁 配置文件结构

```
docker/
├── config/
│   ├── app.dev.json      # 开发环境配置
│   ├── app.prod.json     # 生产环境配置
│   └── README.md         # 配置文件说明
├── backend/
│   ├── config.dev.json   # 后端开发配置
│   ├── config.json       # 后端默认配置
│   └── config.prod.json  # 后端生产配置
├── emqx/
│   ├── emqx.conf         # EMQX默认配置
│   ├── emqx.dev.conf     # EMQX开发配置
│   └── emqx.prod.conf    # EMQX生产配置
├── postgres/
│   ├── postgresql.conf   # PostgreSQL默认配置
│   └── postgresql.prod.conf # PostgreSQL生产配置
├── redis/
│   ├── redis.conf        # Redis默认配置
│   └── redis.prod.conf   # Redis生产配置
└── nginx/
    └── nginx.conf        # Nginx配置
```

## 🔧 应用配置文件

### 开发环境 (`app.dev.json`)
```json
{
  "server": {
    "port": 8000,
    "host": "0.0.0.0"
  },
  "cors": {
    "origin": ["http://localhost:3000", "http://127.0.0.1:3000"],
    "credentials": true,
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allowedHeaders": ["Content-Type", "Authorization", "X-Requested-With"]
  },
  "database": {
    "host": "postgres",
    "port": 5432,
    "database": "iot_platform",
    "username": "iot_user",
    "password": "iot_password"
  },
  "redis": {
    "host": "redis",
    "port": 6379,
    "password": ""
  },
  "mqtt": {
    "host": "emqx",
    "port": 1883,
    "username": "",
    "password": ""
  },
  "jwt": {
    "secret": "dev-secret-key-change-in-production",
    "expiresIn": "24h"
  },
  "logging": {
    "level": "debug",
    "file": "logs/app.log"
  }
}
```

### 生产环境 (`app.prod.json`)
```json
{
  "server": {
    "port": 8000,
    "host": "0.0.0.0"
  },
  "cors": {
    "origin": ["https://yourdomain.com", "https://www.yourdomain.com"],
    "credentials": true,
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allowedHeaders": ["Content-Type", "Authorization", "X-Requested-With"]
  },
  "database": {
    "host": "postgres",
    "port": 5432,
    "database": "iot_platform",
    "username": "iot_user",
    "password": "secure-production-password"
  },
  "redis": {
    "host": "redis",
    "port": 6379,
    "password": "secure-redis-password"
  },
  "mqtt": {
    "host": "emqx",
    "port": 1883,
    "username": "mqtt_user",
    "password": "secure-mqtt-password"
  },
  "jwt": {
    "secret": "super-secure-production-secret-key",
    "expiresIn": "1h"
  },
  "logging": {
    "level": "warn",
    "file": "logs/app.log"
  }
}
```

## 🚀 使用方法

### 开发环境
```bash
# 使用开发环境配置
docker-compose up -d
```

### 生产环境
```bash
# 使用生产环境配置
docker-compose -f docker-compose.prod.yml up -d
```

## 🔐 环境变量覆盖

配置文件支持通过环境变量覆盖：

| 配置项 | 环境变量 | 说明 |
|--------|----------|------|
| 服务器端口 | `PORT` | 服务器监听端口 |
| 服务器主机 | `HOST` | 服务器监听地址 |
| CORS源 | `CORS_ORIGIN` | 允许的跨域源，逗号分隔 |
| 数据库主机 | `DB_HOST` | 数据库主机地址 |
| 数据库端口 | `DB_PORT` | 数据库端口 |
| 数据库名称 | `DB_NAME` | 数据库名称 |
| 数据库用户 | `DB_USER` | 数据库用户名 |
| 数据库密码 | `DB_PASSWORD` | 数据库密码 |
| Redis主机 | `REDIS_HOST` | Redis主机地址 |
| Redis端口 | `REDIS_PORT` | Redis端口 |
| Redis密码 | `REDIS_PASSWORD` | Redis密码 |
| MQTT主机 | `MQTT_HOST` | MQTT主机地址 |
| MQTT端口 | `MQTT_PORT` | MQTT端口 |
| MQTT用户名 | `MQTT_USERNAME` | MQTT用户名 |
| MQTT密码 | `MQTT_PASSWORD` | MQTT密码 |
| JWT密钥 | `JWT_SECRET` | JWT签名密钥 |
| JWT过期时间 | `JWT_EXPIRES_IN` | JWT过期时间 |
| 日志级别 | `LOG_LEVEL` | 日志级别 |
| 日志文件 | `LOG_FILE` | 日志文件路径 |

## 📝 配置示例

### 开发环境环境变量
```bash
export NODE_ENV=development
export CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
export DB_PASSWORD=dev_password
export JWT_SECRET=dev-secret-key
export LOG_LEVEL=debug
```

### 生产环境环境变量
```bash
export NODE_ENV=production
export CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
export DB_PASSWORD=super-secure-password
export REDIS_PASSWORD=secure-redis-password
export MQTT_PASSWORD=secure-mqtt-password
export JWT_SECRET=super-secure-production-secret-key
export LOG_LEVEL=warn
```

## 🔄 配置热重载

配置文件支持热重载，修改配置文件后重启服务即可生效：

```bash
# 重启后端服务
docker-compose restart backend

# 或者重启所有服务
docker-compose restart
```

## 🛡️ 安全注意事项

1. **生产环境密码**: 确保生产环境使用强密码
2. **JWT密钥**: 使用足够复杂的JWT密钥
3. **CORS配置**: 生产环境只允许必要的域名
4. **环境变量**: 敏感信息通过环境变量传递
5. **文件权限**: 确保配置文件权限正确

## 📊 配置验证

使用CLI工具验证配置：

```bash
# 检查配置
./scripts/iot-cli.sh status

# 检查CORS配置
curl -H "Origin: http://localhost:3000" http://localhost:8000/health
```

## 🔧 故障排除

### 常见问题

1. **CORS错误**: 检查`CORS_ORIGIN`配置
2. **数据库连接失败**: 检查数据库配置和网络
3. **Redis连接失败**: 检查Redis配置
4. **MQTT连接失败**: 检查MQTT配置
5. **JWT验证失败**: 检查JWT密钥配置

### 调试命令

```bash
# 查看配置
docker-compose exec backend cat /app/config/app.dev.json

# 查看环境变量
docker-compose exec backend env | grep -E "(CORS|DB|REDIS|MQTT|JWT)"

# 查看日志
docker-compose logs backend
```
