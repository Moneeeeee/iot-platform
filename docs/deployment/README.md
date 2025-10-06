# 部署文档

## 🚀 部署方式

### Docker Compose 部署（推荐）

#### 开发环境
```bash
# 使用基线配置
docker-compose up -d

# 或显式指定
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

#### 生产环境
```bash
# 使用生产环境配置
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 手动部署

#### 1. 环境准备
```bash
# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. 配置环境
```bash
# 复制环境变量文件
cp env.example .env

# 编辑环境变量
nano .env
```

#### 3. 启动服务
```bash
# 创建必要目录
mkdir -p uploads/{images/{avatars,devices,thumbnails,temp},documents/{manuals,certificates,reports},firmware/{ota,backup},exports/{data,logs,reports}} nginx/ssl logs

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

## 🔧 配置管理

### 环境变量配置

```bash
# .env 文件
NODE_ENV=production
TZ=Asia/Shanghai

# 数据库配置
POSTGRES_DB=iot_platform
POSTGRES_USER=iot_user
POSTGRES_PASSWORD=your_secure_password

# Redis配置
REDIS_PASSWORD=your_redis_password

# JWT配置
JWT_SECRET=your_jwt_secret_key

# 域名配置
DOMAIN=fountain.top
```

### 配置文件部署

```bash
# 开发环境使用基线配置
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# 生产环境使用生产配置
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🌐 域名和SSL配置

### Nginx配置

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name fountain.top;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fountain.top;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### SSL证书配置

```bash
# 使用Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d fountain.top

# 或使用自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

## 📊 监控和日志

### 日志管理

```bash
# 使用现代化CLI工具
./scripts/iot-cli.sh status
./scripts/iot-cli.sh logs tail backend
./scripts/iot-cli.sh logs search "error"

# 或使用Docker原生命令
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs --tail=100 backend

# 查看Docker日志文件位置
docker inspect iot-backend | grep LogPath
```

### 健康检查

```bash
# 检查服务健康状态
curl http://localhost:8000/health

# 检查数据库连接
docker-compose exec postgres pg_isready

# 检查Redis连接
docker-compose exec redis redis-cli ping
```

## 🔄 更新和维护

### 服务更新

```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d

# 清理旧镜像
docker image prune -f
```

### 数据备份

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U iot_user iot_platform > backup_$(date +%Y%m%d).sql

# 备份Redis数据
docker-compose exec redis redis-cli BGSAVE
docker cp iot-redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

### 数据恢复

```bash
# 恢复数据库
docker-compose exec -T postgres psql -U iot_user iot_platform < backup_20240101.sql

# 恢复Redis数据
docker cp redis_backup_20240101.rdb iot-redis:/data/dump.rdb
docker-compose restart redis
```

## 🚨 故障排查

### 常见问题

1. **服务启动失败**
   ```bash
   # 查看详细错误信息
   docker-compose logs service_name
   
   # 检查配置文件语法
   docker-compose config
   ```

2. **端口冲突**
   ```bash
   # 查看端口占用
   netstat -tulpn | grep :8000
   
   # 修改端口配置
   # 在docker-compose.yml中修改ports配置
   ```

3. **磁盘空间不足**
   ```bash
   # 清理Docker资源
   docker system prune -a
   
   # 清理日志文件
   sudo journalctl --vacuum-time=7d
   ```

### 性能优化

```bash
# 限制容器资源使用
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 📚 相关文档

- [Docker配置文档](../docker/README.md)
- [Backend文档](../backend/README.md)
- [Frontend文档](../frontend/README.md)
- [监控文档](../monitoring/README.md)
