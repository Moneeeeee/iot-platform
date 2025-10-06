# IoT Platform 文档中心

欢迎来到IoT设备管理平台的文档中心！这里包含了平台的所有技术文档和使用指南。

## 📚 文档目录

### 🏗️ 架构和配置
- **[Docker配置文档](./docker/README.md)** - Docker容器配置管理
- **[Nginx配置文档](./docker/nginx-README.md)** - Nginx反向代理配置
- **[部署文档](./deployment/README.md)** - 平台部署指南
- **[文件管理文档](./deployment/uploads-README.md)** - 文件上传和静态资源管理
- **[升级指南](./deployment/MIGRATION.md)** - 管理工具和日志架构升级指南

### 💻 服务文档
- **[Backend文档](./backend/README.md)** - 后端服务详细文档
- **[Frontend文档](./frontend/README.md)** - 前端应用详细文档

### 🔌 API和集成
- **[API文档](./api/README.md)** - RESTful API接口文档
- **[PowerSafe API文档](./api/PowerSafe-API.md)** - PowerSafe设备专用API
- **[PowerSafe设备文档](./api/powersafe-README.md)** - PowerSafe设备详细文档

### 📊 运维和监控
- **[管理工具文档](./management/README.md)** - 现代化CLI管理工具
- **[监控文档](./monitoring/README.md)** - 系统监控和告警管理
- **[故障排查文档](./troubleshooting/README.md)** - 常见问题解决方案
- **[日志管理文档](./logs/README.md)** - 日志架构和管理

## 🚀 快速开始

### 1. 环境准备
```bash
# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 2. 部署平台
```bash
# 克隆项目
git clone https://github.com/iot-platform/iot-platform.git
cd iot-platform

# 启动服务
docker-compose up -d

# 检查服务状态
docker-compose ps
```

### 3. 访问平台
- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/api/docs
- **EMQX管理界面**: http://localhost:18083

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│  (PostgreSQL)   │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   MQTT Broker   │    │     Redis       │
│   (Reverse      │    │     (EMQX)      │    │    (Cache)      │
│    Proxy)       │    │   Port: 1883    │    │   Port: 6379    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 配置管理

平台采用**基线 + 覆盖**的配置管理模式：

### 开发环境
```bash
# 使用基线配置
docker-compose up -d

# 或显式指定
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### 生产环境
```bash
# 使用生产环境配置
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📊 核心功能

### 🔌 设备管理
- **设备注册**: 支持多种设备类型注册
- **实时监控**: 设备状态和数据实时监控
- **远程控制**: 设备远程配置和控制
- **固件升级**: OTA固件升级管理

### 📈 数据监控
- **实时数据**: 电压、电流、功率等实时监控
- **历史数据**: 数据历史查询和趋势分析
- **告警管理**: 智能告警规则和通知
- **数据可视化**: 丰富的图表和仪表板

### 🔐 安全管理
- **用户认证**: JWT令牌认证
- **权限管理**: 基于角色的访问控制
- **数据加密**: 传输和存储数据加密
- **审计日志**: 完整的操作审计记录

### 🌐 通信协议
- **MQTT**: 设备与平台通信
- **WebSocket**: 实时数据推送
- **RESTful API**: 标准HTTP接口
- **WebSocket API**: 实时双向通信

## 🛠️ 技术栈

### 后端技术
- **Node.js + TypeScript**: 服务端开发
- **Express.js**: Web框架
- **Prisma**: 数据库ORM
- **Socket.io**: WebSocket通信
- **MQTT.js**: MQTT客户端

### 前端技术
- **Next.js 14**: React全栈框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **Shadcn/ui**: UI组件库
- **Recharts**: 数据可视化

### 基础设施
- **Docker**: 容器化部署
- **PostgreSQL**: 主数据库
- **Redis**: 缓存和会话存储
- **EMQX**: MQTT消息代理
- **Nginx**: 反向代理和负载均衡

## 📋 开发指南

### 本地开发环境
```bash
# 启动开发环境
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# 查看服务日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 代码贡献
1. Fork项目仓库
2. 创建功能分支
3. 提交代码变更
4. 创建Pull Request

### 测试
```bash
# 运行单元测试
npm test

# 运行集成测试
npm run test:integration

# 运行E2E测试
npm run test:e2e
```

## 🔍 故障排查

### 常见问题
- **服务启动失败**: 检查端口占用和配置文件
- **数据库连接失败**: 验证数据库配置和网络连接
- **MQTT连接失败**: 检查EMQX服务状态和配置
- **前端页面无法访问**: 检查Nginx配置和SSL证书

### 获取帮助
- 查看[故障排查文档](./troubleshooting/README.md)
- 提交[GitHub Issue](https://github.com/iot-platform/issues)
- 联系技术支持: support@iot-platform.com

## 📈 版本信息

- **当前版本**: v1.0.0
- **最后更新**: 2024-01-01
- **Node.js版本**: 18.x
- **Docker版本**: 20.x+

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情。

## 🤝 贡献

欢迎贡献代码、报告问题或提出改进建议！

1. 查看[贡献指南](../CONTRIBUTING.md)
2. 阅读[代码规范](../CODE_STYLE.md)
3. 提交[Pull Request](../pulls)

---

**技术支持**: support@iot-platform.com  
**项目地址**: https://github.com/iot-platform/iot-platform  
**在线文档**: https://docs.iot-platform.com
