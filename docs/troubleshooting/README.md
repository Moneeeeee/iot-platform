# 故障排查文档

## 🚨 常见问题

### 1. 服务启动问题

#### Backend服务无法启动
```bash
# 检查服务状态
docker-compose ps backend

# 查看详细日志
docker-compose logs backend

# 常见错误及解决方案
```

**错误**: `Database connection failed`
```bash
# 解决方案
1. 检查PostgreSQL服务状态
docker-compose ps postgres

2. 检查数据库配置
cat docker/backend/config.json

3. 重启数据库服务
docker-compose restart postgres
```

**错误**: `MQTT connection failed`
```bash
# 解决方案
1. 检查EMQX服务状态
docker-compose ps emqx

2. 检查MQTT配置
cat docker/backend/config.json | grep mqtt

3. 重启EMQX服务
docker-compose restart emqx
```

#### Frontend服务无法启动
```bash
# 检查服务状态
docker-compose ps frontend

# 查看构建日志
docker-compose logs frontend

# 常见错误及解决方案
```

**错误**: `Build failed`
```bash
# 解决方案
1. 清理构建缓存
docker-compose build --no-cache frontend

2. 检查Node.js版本
docker-compose exec frontend node --version

3. 重新构建
docker-compose up -d frontend
```

### 2. 数据库问题

#### PostgreSQL连接问题
```bash
# 检查数据库状态
docker-compose exec postgres pg_isready

# 查看数据库日志
docker-compose logs postgres

# 连接数据库
docker-compose exec postgres psql -U iot_user -d iot_platform
```

**错误**: `Connection refused`
```bash
# 解决方案
1. 检查端口占用
netstat -tulpn | grep 5432

2. 重启PostgreSQL
docker-compose restart postgres

3. 检查配置文件
cat docker/postgres/postgresql.conf
```

#### 数据库迁移问题
```bash
# 运行数据库迁移
docker-compose exec backend npx prisma migrate dev

# 重置数据库
docker-compose exec backend npx prisma migrate reset

# 生成Prisma客户端
docker-compose exec backend npx prisma generate
```

### 3. MQTT问题

#### EMQX连接问题
```bash
# 检查EMQX状态
docker-compose exec emqx /opt/emqx/bin/emqx ping

# 查看EMQX日志
docker-compose logs emqx

# 检查配置文件
cat docker/emqx/emqx.conf
```

**错误**: `EMQX configuration error`
```bash
# 解决方案
1. 检查HOCON语法
docker-compose exec emqx /opt/emqx/bin/emqx check

2. 验证配置文件
docker-compose exec emqx /opt/emqx/bin/emqx config

3. 重启EMQX
docker-compose restart emqx
```

#### MQTT客户端连接问题
```bash
# 测试MQTT连接
mosquitto_pub -h localhost -p 1883 -t test/topic -m "hello"

# 查看连接统计
curl http://localhost:18083/api/v5/clients
```

### 4. 网络问题

#### 端口冲突
```bash
# 查看端口占用
netstat -tulpn | grep :8000

# 修改端口配置
# 编辑docker-compose.yml
ports:
  - "8001:8000"  # 修改主机端口
```

#### 容器间通信问题
```bash
# 检查网络连接
docker network ls
docker network inspect iot-platform_default

# 测试容器间连接
docker-compose exec backend ping postgres
docker-compose exec backend ping redis
```

### 5. 配置问题

#### 配置文件错误
```bash
# 验证Docker Compose配置
docker-compose config

# 检查JSON语法
cat docker/backend/config.json | jq .

# 检查HOCON语法
docker-compose exec emqx /opt/emqx/bin/emqx check
```

#### 环境变量问题
```bash
# 检查环境变量
docker-compose exec backend env | grep -E "(DATABASE|REDIS|MQTT)"

# 查看配置文件路径
docker-compose exec backend ls -la /app/config/
```

## 🔧 诊断工具

### 1. 系统诊断

#### 资源使用检查
```bash
# 查看系统资源
docker stats

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看CPU使用
top
```

#### 网络诊断
```bash
# 查看网络连接
netstat -tulpn

# 测试网络连通性
ping google.com
telnet fountain.top 443

# 查看DNS解析
nslookup fountain.top
```

### 2. 应用诊断

#### 服务健康检查
```bash
# Backend健康检查
curl http://localhost:8000/health

# Frontend健康检查
curl http://localhost:3000

# EMQX健康检查
curl http://localhost:18083/api/v5/status
```

#### 日志分析
```bash
# 查看实时日志
docker-compose logs -f

# 过滤错误日志
docker-compose logs | grep ERROR

# 查看特定时间日志
docker-compose logs --since="2024-01-01T00:00:00"
```

### 3. 数据库诊断

#### PostgreSQL诊断
```bash
# 连接数据库
docker-compose exec postgres psql -U iot_user -d iot_platform

# 查看数据库大小
SELECT pg_size_pretty(pg_database_size('iot_platform'));

# 查看表大小
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname='public';

# 查看连接数
SELECT count(*) FROM pg_stat_activity;
```

#### Redis诊断
```bash
# 连接Redis
docker-compose exec redis redis-cli

# 查看Redis信息
INFO

# 查看内存使用
INFO memory

# 查看连接数
INFO clients
```

## 🛠️ 修复步骤

### 1. 服务重启流程

#### 完整重启
```bash
# 停止所有服务
docker-compose down

# 清理资源
docker system prune -f

# 重新启动
docker-compose up -d

# 检查服务状态
docker-compose ps
```

#### 单个服务重启
```bash
# 重启特定服务
docker-compose restart backend

# 重新构建并启动
docker-compose up -d --build backend

# 查看启动日志
docker-compose logs -f backend
```

### 2. 数据恢复流程

#### 数据库恢复
```bash
# 备份当前数据
docker-compose exec postgres pg_dump -U iot_user iot_platform > backup_$(date +%Y%m%d).sql

# 恢复数据
docker-compose exec -T postgres psql -U iot_user iot_platform < backup_20240101.sql

# 验证恢复
docker-compose exec postgres psql -U iot_user -d iot_platform -c "SELECT count(*) FROM devices;"
```

#### 配置文件恢复
```bash
# 恢复配置文件
git checkout HEAD -- docker/backend/config.json
git checkout HEAD -- docker/emqx/emqx.conf

# 重启服务
docker-compose restart backend emqx
```

### 3. 网络修复流程

#### 网络重置
```bash
# 停止服务
docker-compose down

# 删除网络
docker network prune -f

# 重新启动
docker-compose up -d
```

#### 端口修复
```bash
# 查看端口占用
lsof -i :8000

# 杀死占用进程
sudo kill -9 <PID>

# 重启服务
docker-compose restart backend
```

## 📋 检查清单

### 1. 启动前检查

- [ ] Docker和Docker Compose已安装
- [ ] 端口80、443、8000、3000、5432、6379、1883未被占用
- [ ] 磁盘空间充足（至少10GB）
- [ ] 内存充足（至少4GB）
- [ ] 网络连接正常

### 2. 配置检查

- [ ] 环境变量文件存在且配置正确
- [ ] 配置文件语法正确
- [ ] SSL证书文件存在（生产环境）
- [ ] 数据库密码已设置
- [ ] JWT密钥已配置

### 3. 服务检查

- [ ] 所有容器状态为"Up"
- [ ] 健康检查通过
- [ ] 日志无错误信息
- [ ] 数据库连接正常
- [ ] MQTT连接正常
- [ ] API接口可访问

### 4. 功能检查

- [ ] 用户登录功能正常
- [ ] 设备管理功能正常
- [ ] 数据监控功能正常
- [ ] 告警功能正常
- [ ] WebSocket连接正常

## 📞 技术支持

### 日志收集
```bash
# 收集系统信息
uname -a > system_info.txt
docker version >> system_info.txt
docker-compose version >> system_info.txt

# 收集服务日志
docker-compose logs > service_logs.txt

# 收集配置信息
docker-compose config > docker_config.txt
```

### 联系方式
- **技术支持邮箱**: support@iot-platform.com
- **紧急联系电话**: +86-xxx-xxxx-xxxx
- **在线文档**: https://docs.iot-platform.com
- **GitHub Issues**: https://github.com/iot-platform/issues

## 📚 相关文档

- [部署文档](../deployment/README.md)
- [监控文档](../monitoring/README.md)
- [Backend文档](../backend/README.md)
- [Docker配置文档](../docker/README.md)
