# Nginx 配置说明

## 📁 目录结构

```
nginx/
├── nginx.conf          # 主配置文件
├── ssl/                # SSL证书目录
│   ├── fountain.top.crt    # SSL证书文件
│   ├── fountain.top.key    # SSL私钥文件
│   └── dhparam.pem         # DH参数文件
└── conf.d/             # 额外配置文件目录
    ├── default.conf        # 默认站点配置
    └── ssl.conf            # SSL配置
```

## 🔧 配置说明

### 主配置文件 (nginx.conf)
- 基础HTTP配置
- 性能优化设置
- 日志格式定义
- 反向代理配置

### SSL配置
- 支持HTTPS访问
- 自动HTTP到HTTPS重定向
- 现代SSL配置

## 🚀 使用方法

### 开发环境
```bash
# 直接访问服务端口
http://localhost:3000  # 前端
http://localhost:8000  # 后端
```

### 生产环境
```bash
# 通过Nginx代理访问
https://fountain.top/     # 前端
https://fountain.top/api/ # 后端API
```

## 📋 SSL证书配置

### 自签名证书（开发用）
```bash
# 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/fountain.top.key \
  -out nginx/ssl/fountain.top.crt
```

### Let's Encrypt证书（生产用）
```bash
# 使用certbot获取免费SSL证书
certbot certonly --webroot -w /var/www/html -d fountain.top
```

## 🔍 故障排查

### 常见问题
1. **端口冲突**: 确保80/443端口未被占用
2. **SSL证书**: 检查证书文件路径和权限
3. **配置语法**: 使用 `nginx -t` 检查配置

### 日志查看
```bash
# Nginx访问日志
tail -f /var/log/nginx/access.log

# Nginx错误日志
tail -f /var/log/nginx/error.log
```
