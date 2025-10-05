/**
 * 简化的服务器入口文件
 * 用于快速测试部署
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'up',
      redis: 'up',
      mqtt: 'up',
    },
  });
});

// API路由
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'IoT Device Management Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 认证路由
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        user: {
          id: '1',
          username: 'admin',
          email: 'admin@iot-platform.com',
          role: 'ADMIN',
          permissions: ['user:create', 'user:read', 'user:update', 'user:delete'],
          language: 'zh-CN',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: 'mock-jwt-token',
        expiresIn: '7d',
      },
      message: '登录成功',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(401).json({
      success: false,
      error: '用户名或密码错误',
      timestamp: new Date().toISOString(),
    });
  }
});

// 设备路由
app.get('/api/devices', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        slug: 'smart-sensor-001',
        name: '智能传感器001',
        type: 'SMART_SENSOR',
        status: 'ONLINE',
        capabilities: ['temperature', 'humidity'],
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        slug: 'smart-gateway-001',
        name: '智能网关001',
        type: 'SMART_GATEWAY',
        status: 'ONLINE',
        capabilities: ['data_forwarding', 'protocol_conversion'],
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    },
    timestamp: new Date().toISOString(),
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'IoT Device Management Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
  });
});

// 错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Documentation: http://localhost:${port}/api`);
});

export default app;
