# IoT设备管理平台

一个专业的、稳定的IoT设备管理平台，支持多种通信协议和设备类型。

## 🏗️ 项目架构

```
iot-platform/
├── backend/                 # 后端服务
│   ├── src/                # 源代码
│   │   ├── config/         # 配置文件
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由
│   │   ├── services/       # 业务服务
│   │   ├── types/          # 类型定义
│   │   └── utils/          # 工具函数
│   ├── prisma/             # 数据库模式
│   ├── tests/              # 测试文件
│   ├── Dockerfile          # Docker配置
│   └── package.json        # 依赖配置
├── frontend/               # 前端应用
│   ├── src/                # 源代码
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # React组件
│   │   ├── hooks/          # 自定义Hooks
│   │   ├── lib/            # 工具库
│   │   ├── services/       # API服务
│   │   └── types/          # 类型定义
│   ├── public/             # 静态资源
│   ├── Dockerfile          # Docker配置
│   └── package.json        # 依赖配置
├── docker/                 # Docker配置
│   ├── mosquitto/          # MQTT Broker配置
│   └── nginx/              # Nginx配置
├── docs/                   # 项目文档
├── scripts/                # 部署脚本
├── docker-compose.yml      # Docker编排
└── README.md              # 项目说明
```

## 🚀 快速开始

### 环境要求
- Node.js >= 20.0.0
- Docker >= 20.0.0
- PostgreSQL >= 14.0
- Redis >= 6.0

### 安装和运行

1. **克隆项目**
```bash
git clone <repository-url>
cd iot-platform
```

2. **环境配置**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等
```

3. **启动服务**
```bash
# 使用Docker启动所有服务
docker-compose up -d

# 或者分别启动
docker-compose up -d postgres redis mosquitto
npm run dev:backend
npm run dev:frontend
```

4. **访问应用**
- 前端: http://localhost:3000
- 后端API: http://localhost:8000
- MQTT Broker: mqtt://localhost:1883

## 📋 功能特性

### 核心功能
- ✅ 用户认证和权限管理
- ✅ 设备管理和监控
- ✅ 实时数据展示
- ✅ 多协议支持 (MQTT, HTTP, TCP, UDP)
- ✅ 告警和通知系统
- ✅ 多语言支持 (中文/英文)

### 技术栈
- **前端**: Next.js 14, TypeScript, Tailwind CSS
- **后端**: Node.js, Express, TypeScript
- **数据库**: PostgreSQL, Redis
- **消息队列**: MQTT (Mosquitto)
- **部署**: Docker, Nginx

## 🔧 开发指南

### 后端开发
```bash
cd backend
npm install
npm run dev          # 开发模式
npm run build        # 构建
npm run test         # 测试
npm run lint         # 代码检查
```

### 前端开发
```bash
cd frontend
npm install
npm run dev          # 开发模式
npm run build        # 构建
npm run test         # 测试
npm run lint         # 代码检查
```

### 数据库管理
```bash
cd backend
npm run migrate      # 运行迁移
npm run generate     # 生成Prisma客户端
npm run seed         # 填充测试数据
```

## 📚 API文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出

### 设备管理
- `GET /api/devices` - 获取设备列表
- `POST /api/devices` - 创建设备
- `GET /api/devices/:id` - 获取设备详情
- `PUT /api/devices/:id` - 更新设备
- `DELETE /api/devices/:id` - 删除设备

### 实时数据
- `WebSocket /ws` - 实时数据推送
- `GET /api/devices/:id/data` - 获取设备数据

## 🐳 Docker部署

### 生产环境部署
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 环境变量配置
```bash
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/iot_platform
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# MQTT配置
MQTT_BROKER_URL=mqtt://localhost:1883
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

- 项目链接: [https://github.com/your-username/iot-platform](https://github.com/your-username/iot-platform)
- 问题反馈: [Issues](https://github.com/your-username/iot-platform/issues)