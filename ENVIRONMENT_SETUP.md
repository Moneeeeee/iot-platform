# IoT平台环境配置指南

## 环境变量配置

本项目使用环境变量来管理不同环境的配置，确保代码与具体部署环境解耦。

### 快速开始

1. **复制环境变量模板**：
   ```bash
   cp env.example .env
   ```

2. **根据您的环境修改配置**：
   - 编辑 `.env` 文件
   - 修改域名、数据库连接等配置

3. **启动服务**：
   ```bash
   docker-compose up -d
   ```

### 重要配置项说明

#### 🌐 域名配置
```bash
# CORS跨域配置 - 支持多个域名
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com

# 前端API URL（前端使用）
NEXT_PUBLIC_API_URL=

# 前端URL（后端使用）
FRONTEND_URL=http://localhost:3000
```

#### 🔐 安全配置
```bash
# JWT密钥 - 生产环境请使用强密钥
JWT_SECRET=your-super-secret-jwt-key-here

# 密码加密轮数
BCRYPT_ROUNDS=12
```

#### 🗄️ 数据库配置
```bash
# PostgreSQL连接
DATABASE_URL=postgresql://iot_user:iot_password@postgres:5432/iot_platform

# Redis缓存
REDIS_URL=redis://redis:6379
```

#### 📡 MQTT配置
```bash
# MQTT消息代理
MQTT_BROKER_URL=mqtt://emqx:1883
```

### 部署到不同环境

#### 开发环境
```bash
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

#### 生产环境
```bash
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
JWT_SECRET=your-production-secret-key
```

#### 测试环境
```bash
NODE_ENV=test
CORS_ORIGIN=http://test.yourdomain.com
```

### 添加新域名

如果您需要添加新的域名支持：

1. **修改环境变量**：
   ```bash
   CORS_ORIGIN=http://localhost:3000,https://yourdomain.com,https://newdomain.com
   ```

2. **重启后端服务**：
   ```bash
   docker-compose restart backend
   ```

### 安全建议

1. **生产环境**：
   - 使用强JWT密钥
   - 启用HTTPS
   - 限制CORS域名
   - 定期更新密码

2. **环境变量管理**：
   - 不要将 `.env` 文件提交到版本控制
   - 使用环境变量管理工具（如HashiCorp Vault）
   - 定期轮换密钥

### 故障排除

#### CORS错误
如果遇到CORS错误，检查：
1. `CORS_ORIGIN` 是否包含您的域名
2. 域名格式是否正确（包含协议）
3. 后端服务是否重启

#### 数据库连接错误
检查：
1. `DATABASE_URL` 格式是否正确
2. 数据库服务是否运行
3. 网络连接是否正常

#### MQTT连接错误
检查：
1. `MQTT_BROKER_URL` 是否正确
2. EMQX服务是否运行
3. 端口是否开放

### 配置验证

启动服务后，可以通过以下方式验证配置：

```bash
# 检查健康状态
curl http://yourdomain.com/health

# 检查API状态
curl http://yourdomain.com/api

# 测试登录
curl -X POST http://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
